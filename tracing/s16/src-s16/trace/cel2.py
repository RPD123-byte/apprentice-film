#!/usr/bin/env python3
# s16 room, fix 1: the two headphone cups round his neck, redrawn (replaces cel.py's 12 fine cel levels at sigma 0.9,
# which were close to a posterised copy of the source). Each cup zone (read off a 2x grid of 47.00, as before) is now:
#   base   one dark tone (the median of the zone's dark part)
#   levels a coarse value study of the zone: the plate blurred sigma 3, <= 8 levels (the room plate's method), painted
#          flat and softened in room.js
#   light  (LTH > 0 only) lit shapes at one threshold, painted flat at their mean
#   pale   the pale lines (the cushion's ribs, the rim rings): centre-lines with width and value (the s12 method)
#   dark   the dark lines over the lit shapes: centre-lines (the s12 method)
# drawn in room.js as a flat base, flat shapes and tapered strokes. Output data/cel.js (geometry and values only).
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
import m16, cv2, numpy as np
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'cel.js')
M = m16.M
E = m16.plateE()[M:M + 946, M:M + 2206]
ZONES = {
    'hpL': [(1240, 470), (1262, 432), (1300, 420), (1330, 430), (1352, 455), (1370, 500), (1376, 560), (1370, 610), (1352, 645),
            (1320, 660), (1280, 655), (1250, 630), (1238, 580)],
    'hpR': [(1448, 470), (1462, 430), (1490, 408), (1530, 405), (1565, 420), (1590, 450), (1600, 500), (1598, 560), (1585, 610),
            (1560, 640), (1520, 648), (1480, 635), (1458, 600), (1448, 540)],
}
LTH = float(os.environ.get('LTH', 0))
PHI = float(os.environ.get('PHI', 0.05)); MINL = float(os.environ.get('MINL', 8)); EDGE = float(os.environ.get('EDGE', 0.55))
res = []
for k, P in ZONES.items():
    m = np.zeros(E.shape, np.uint8); cv2.fillPoly(m, [np.array(P, np.int32)], 1)
    m = cv2.dilate(m, np.ones((5, 5), np.uint8))
    x0, y0, w, h = cv2.boundingRect(m)
    Ec = E[y0:y0 + h, x0:x0 + w]; mc = m[y0:y0 + h, x0:x0 + w]
    B15 = cv2.GaussianBlur(Ec, (0, 0), 1.5)
    base = float(np.median(Ec[(mc > 0) & (B15 < 0.3)]))
    # the lit shapes: one threshold, >= 40 px, each at its mean
    lit = ((B15 >= (LTH if LTH > 0 else 9)) & (mc > 0)).astype(np.uint8)
    lit = cv2.morphologyEx(lit, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(lit)
    light = []
    litk = np.zeros_like(lit)
    for i in range(1, n):
        if st[i, 4] < 40: continue
        comp = (lab == i).astype(np.uint8); litk |= comp
        for r in m16.isolines(cv2.GaussianBlur(comp.astype(np.float32), (0, 0), 1.0), 0.5, 0.6, 20, (x0, y0)):
            light.append([round(float(Ec[comp > 0].mean()) * 1000)] + [round(float(v), 1) for v in r.ravel()])
    # pale lines outside the lit shapes, dark lines inside them
    zp = (mc > 0) & (cv2.dilate(litk, np.ones((3, 3), np.uint8)) == 0)
    pale = m16.strokes(Ec, 'pale', mask=zp.astype(np.uint8), sigmas=(0.8, 1.2), hi=PHI, lo=PHI / 2, dmin=0.08, minlen=MINL, eps=0.5, edge=EDGE,
                       smooth=3, win=9, off=(x0, y0))
    zd = (cv2.erode(litk, np.ones((3, 3), np.uint8)) if LTH > 0 else (cv2.GaussianBlur(Ec, (0, 0), 3) > 0.45).astype(np.uint8)) & mc
    dark = m16.strokes(Ec, 'dark', mask=zd.astype(np.uint8), sigmas=(0.8, 1.2), hi=PHI, lo=PHI / 2, dmin=0.08, minlen=MINL, eps=0.5,
                       smooth=3, win=9, off=(x0, y0))
    # the coarse value study (sigma 3, <= 8 levels)
    TH = [0.08, 0.15, 0.23, 0.32, 0.42, 0.53, 0.65, 0.78]
    # (the lines drawn on top are inpainted away first, so their light is not counted twice)
    cp, _ = m16.stroke_raster(pale, Ec.shape, True, (x0, y0)); cd_, _ = m16.stroke_raster(dark, Ec.shape, False, (x0, y0))
    ink = cv2.dilate(((cp > 0.2) | (cd_ > 0.2)).astype(np.uint8), np.ones((3, 3), np.uint8))
    Ei = cv2.inpaint(np.clip(Ec, 0, 1).astype(np.float32), ink, 3, cv2.INPAINT_TELEA)
    LV, _ = m16.value_levels(np.where(mc > 0, Ei, 0).astype(np.float32), 3.0, TH, eps=1.0, minarea=30, off=(x0, y0), mask=mc)
    levels = [[round(v * 1000)] + [[round(float(q), 1) for q in r.ravel()] for r in rings] for v, rings in LV]
    res.append(dict(zone=[v for p in P for v in p], base=round(base, 3), levels=levels, light=light,
                    pale=[[v for p in s for v in p] for s in pale], dark=[[v for p in s for v in p] for s in dark]))
    print(k, 'base %.3f' % base, 'levels', len(levels), 'light', len(light), 'pale', len(pale), 'dark', len(dark))
with open(OUT, 'w') as f:
    f.write('// s16 room: the headphone cups round his neck (src/shots/s16/trace/cel2.py; geometry and values only, frame px).\n')
    f.write('// zone = outline; base = one dark tone; light = lit shapes [value*1000, ring] at one threshold; pale / dark = centre-lines\n')
    f.write('// [x, y, w, v, ...] drawn as tapered strokes.\n')
    f.write('export const CEL = %s;\n' % json.dumps(res, separators=(',', ':')))
print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB')
