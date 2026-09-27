#!/usr/bin/env python3
# s16 room, this pass: the two headphone cups round his neck as fine cel levels (the s13 method: sigma-0.9 light
# outlines at 12 levels, painted flat) instead of the engraving + traced lines, which read as a tangle there.
# Zones read off a 2x grid of 47.00 (frame px). Output data/cel.js (geometry only).
import sys, os
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
TH = [0.95, 0.87, 0.79, 0.71, 0.63, 0.55, 0.47, 0.39, 0.31, 0.23, 0.15, 0.08]
Y = cv2.GaussianBlur(E, (0, 0), 0.9)
res = {}
for k, P in ZONES.items():
    m = np.zeros(E.shape, np.uint8); cv2.fillPoly(m, [np.array(P, np.int32)], 1)
    m = cv2.dilate(m, np.ones((5, 5), np.uint8))
    x0, y0, w, h = cv2.boundingRect(m)
    img = np.where(m > 0, Y, 1.5)[y0:y0 + h, x0:x0 + w].astype(np.float32)
    base = float(np.median(Y[m > 0]))
    L = []
    # painted light -> dark on a black base: region {img >= t} for descending t would nest wrongly; paint the base
    # the darkest level and then each lighter region on top (img >= t), value = mean of its band
    ts = sorted(TH)
    for i, t in enumerate(ts):
        hi = ts[i + 1] if i + 1 < len(ts) else 2.0
        band = (img >= t) & (img < hi) & (img < 1.4)
        if band.sum() < 4: continue
        rings = m16.isolines(cv2.GaussianBlur(((img >= t) & (img < 1.4)).astype(np.float32), (0, 0), 0.5), 0.5, 0.45, 4, (x0, y0))
        if rings: L.append((float(img[band].mean()), rings))
    lo = (m > 0) & (Y < min(TH))
    res[k] = (P, float(np.clip(Y[lo].mean() if lo.any() else Y[m > 0].min(), 0, 1)), L)      # base: the mean below the lowest level
    print(k, 'levels', len(L), 'rings', sum(len(r) for _, r in L))
with open(OUT, 'w') as f:
    f.write('// s16 room: fine cel levels of the headphone cups round his neck, measured by src/shots/s16/trace/cel.py\n')
    f.write('// (geometry only, frame px). zone = outline; base = mean below the lowest level; L = [value*1000, rings] painted in order.\n')
    f.write('export const CEL = [\n')
    for k, (P, b, L) in res.items():
        f.write('{zone:[%s],base:%.3f,L:[%s]},\n' % (','.join('%d,%d' % p for p in P), b, ',\n'.join('[%d,%s]' % (round(v * 1000), m16.js_rings(r, 1)) for v, r in L)))
    f.write('];\n')
print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB')
