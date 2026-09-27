#!/usr/bin/env python3
# s16 room: measure the static plate (the designer at his desk, steady framing) into data/room.js.
#   1. major ink lines (dark on lit areas, pale on dark ones), s12 method; regular hatching is dropped (the engraver
#      cuts its own hatching from the value study and the measured direction)
#   2. value study: outlines of the light on the plate with its traced lines inpainted away, blurred at sigma 3.5
#      (features under ~8 px are gone), 22 levels
#   3. hatch-direction regions (structure tensor, votes weighted by coherence and contrast, 12 bins)
#   cal: light matching: compare a raw render of the room (pre-grade, harness) with the plate, both blurred, and move
#      the value study by the difference (STYLE.md: "paint a value study that matches the source's light")
# Measurement base: the clean plate of build_plate.py (snapshots/s16-p2-tools/plateE.npy; frame 1175 with the owl's
# place from 1153, iris-free eyes, the steam blacked out, margins from the jolt / pull-back frames).
# Output is geometry only. Usage: python3 room.py all | cal raw.png [gain]
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
import m16, cv2, numpy as np

OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'room.js')
WORK = m16.ROOT + '/snapshots/s16-h1-work'
M = m16.M
E = m16.plateE()
# build_plate.py blacked the steam out down to y 718, which also took the mug's rim (705-718): put the rim back from
# frame 1175 (the steam's lowest wisps there are drawn over it anyway)
E[M + 698:M + 720, M + 700:M + 900] = m16.pre(1175)[698:720, 700:900]
Hh, Ww = E.shape
off = (-M, -M)
P = json.load(open(os.path.join(os.path.dirname(__file__), 'room_polys.json')))
env = lambda k, d: float(os.environ.get(k, d))
mode = sys.argv[1] if len(sys.argv) > 1 else 'all'


def polymask(name, grow=0):
    m = np.zeros((Hh, Ww), np.uint8)
    for poly in P.get(name, []):
        cv2.fillPoly(m, [np.round((np.array(poly, float) + M) * 4).astype(np.int32)], 1, shift=2)
    if grow > 0: m = cv2.dilate(m, np.ones((2 * grow + 1, 2 * grow + 1), np.uint8))
    if grow < 0: m = cv2.erode(m, np.ones((-2 * grow + 1, -2 * grow + 1), np.uint8))
    return m


CLS = {'default': 0, 'hair': 1, 'beanie': 2, 'flat': 3, 'skin': 4, 'desk': 5, 'shirt': 6, 'clean': 7, 'mug': 8, 'stipple': 9}
FORCE = {CLS['desk']: 0, CLS['mug']: 6, CLS['stipple']: 6}      # classes with one measured stroke direction (bin): grain, the mug's hatching
cls = np.zeros((Hh, Ww), np.uint8)
for name in ['shirt', 'skin', 'hair', 'beanie', 'desk', 'flat', 'mug', 'stipple', 'clean']:
    cls[polymask(name) > 0] = CLS[name]
SIG = env('VSIG', 3.5)
TH = [0.025, 0.05, 0.09, 0.14, 0.19, 0.24, 0.29, 0.34, 0.39, 0.44, 0.49, 0.54, 0.59, 0.64, 0.69, 0.74, 0.79, 0.84, 0.88, 0.92, 0.95, 0.975]


def write_js(levels, dirs, dark, pale):
    with open(OUT, 'w') as f:
        f.write('// s16 room, measured on the steady plate by src/shots/s16/trace/room.py (geometry only, frame px):\n')
        f.write('//   LEVELS  value study: [value*1000, ring, ...] painted in order (even-odd); outlines of the light on a\n')
        f.write('//           sigma-3.5 blurred frame with its traced lines inpainted away (then matched to the source\'s light\n')
        f.write('//           on blurred renders), 22 levels, simplified to 2 px. The engraver cuts lines from it.\n')
        f.write('//   DIRS    hatch direction: [bin (x 15 deg), class, ring, ...]; classes set spacing/style (room.js CLASSES)\n')
        f.write('//   DARK / PALE  major ink lines: flat [x, y, w, v, ...] centre-lines (width px, value 0..1), s12 method;\n')
        f.write('//           regular hatching is left out (the engraver cuts it)\n')
        f.write('export const LEVELS = [\n' + ',\n'.join('[%d,%s]' % (round(v * 1000), m16.js_rings(r)) for v, r in levels) + '];\n')
        f.write('export const DIRS = [\n' + ',\n'.join('[%d,%d,%s]' % (k, c, m16.js_rings(r)) for k, c, r in dirs) + '];\n')
        f.write('export const DARK = [\n' + m16.js_strokes(dark) + '];\n')
        f.write('export const PALE = [\n' + m16.js_strokes(pale) + '];\n')
    print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB')


if mode == 'all':
    # ---- 1. ink lines
    Bs = cv2.GaussianBlur(E, (0, 0), 4)
    noink = polymask('noink', 2)
    knit = np.zeros_like(cls)             # (the beanie's rib lines are traced too)
    dark = m16.strokes(E, 'dark', mask=((Bs > 0.12) & (noink == 0) & (knit == 0)).astype(np.uint8), sigmas=(1.0, 2.0),
                       hi=env('DHI', 0.06), lo=env('DLO', 0.03), dmin=0.08, minlen=env('DMIN', 12), off=off, edge=env('DEDGE', 0.45))
    pale = m16.strokes(E, 'pale', mask=((Bs < env('PMASK', 0.4)) & (noink == 0) & (knit == 0)).astype(np.uint8), sigmas=(1.0, 1.8),
                       hi=env('PHI', 0.06), lo=env('PLO', 0.03), dmin=0.08, minlen=env('PMIN', 12), off=off, edge=env('PEDGE', 0.5))
    pale = [s for s in pale if np.mean([p[3] for p in s]) > env('PVMIN', 0.4)]
    dark, dh = m16.hatch_filter(dark, rad=env('HRAD', 7), need=2, lmax=env('HLMAX', 40), wmax=env('HWMAX', 4.5))
    pale, ph = m16.hatch_filter(pale, rad=env('HRAD', 7), need=2, lmax=env('HLMAX', 40), wmax=env('HWMAX', 4.5))
    WK = env('WK', 0.85)     # the source's lines are soft; an opaque stroke of the full half-max width reads heavier
    for S in (dark, pale):
        for s in S:
            for p in s: p[2] = round(max(0.6, p[2] * WK), 1)
    # the beanie's knit: its rib lines are fine grey lines (thinner, a little paler); its pale lines are left out
    bm = polymask('beanie', -3)
    inb = lambda s: bm[int(round(s[len(s) // 2][1])) + M, int(round(s[len(s) // 2][0])) + M] > 0
    for s in dark:
        if inb(s):
            for p in s: p[2] = round(max(0.6, p[2] * 0.6), 1); p[3] = round(min(1.0, p[3] + 0.08), 2)
    pale = [s for s in pale if not inb(s)]
    # on his face the source's lines are soft pencil-grey: a little thinner and paler there
    sm_ = polymask('skin', 0)
    ins = lambda s: sm_[int(round(s[len(s) // 2][1])) + M, int(round(s[len(s) // 2][0])) + M] > 0
    for s in dark:
        if ins(s):
            for p in s: p[2] = round(max(0.6, p[2] * 0.8), 1); p[3] = round(min(1.0, p[3] + 0.05), 2)
    print('strokes: dark', len(dark), '(hatch dropped', len(dh), ') pale', len(pale), '(hatch dropped', len(ph), ')')
    json.dump({'dark': dark, 'pale': pale, 'dh': dh, 'ph': ph}, open(WORK + '/room_strokes.json', 'w'))

    # ---- 2. value study, corrected for the lines drawn on top
    # measured BETWEEN the ink lines: the traced lines are inpainted away first (no dark halo round the features),
    # then blurred; the light-matching rounds (cal) take up the rest
    B = cv2.GaussianBlur(E, (0, 0), SIG)
    cd, vd = m16.stroke_raster(dark, E.shape, False, off)
    cp, vp = m16.stroke_raster(pale, E.shape, True, off)
    ink = cv2.dilate(((cd > 0.15) | (cp > 0.15)).astype(np.uint8), np.ones((3, 3), np.uint8))
    Ei = cv2.inpaint(np.clip(E, 0, 1).astype(np.float32), ink, 4, cv2.INPAINT_TELEA)
    # blurred within the lit things and within the dark ground separately, so no light bleeds across a silhouette
    # (a halo round the mug or his shoulders would be cut into lines by the engraver)
    fg = (cv2.GaussianBlur(Ei, (0, 0), 1.0) > 0.07).astype(np.uint8)
    fg = cv2.morphologyEx(cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)).astype(np.float32)
    nbm = lambda X, m: cv2.GaussianBlur(X * m, (0, 0), SIG) / np.maximum(1e-3, cv2.GaussianBlur(m, (0, 0), SIG))
    Vt = np.clip(np.where(fg > 0, nbm(Ei, fg), nbm(Ei, 1 - fg)), 0, 1).astype(np.float32)
    np.save(WORK + '/room_fg.npy', fg)
    Vt[cls == CLS['flat']] = B[cls == CLS['flat']]
    np.save(WORK + '/room_vt.npy', Vt)
    # where the skin shows through the hair masses, engrave it as skin
    cls[(cls == CLS['hair']) & (Vt > 0.55)] = CLS['skin']

    # ---- 3. hatch directions: votes weighted by coherence x contrast, smoothed hard (few large regions)
    th, coh = m16.orientation(E, 1.0, 7.0)
    g = cv2.GaussianBlur(E, (0, 0), 1.0)
    en = cv2.GaussianBlur(cv2.Sobel(g, cv2.CV_32F, 1, 0) ** 2 + cv2.Sobel(g, cv2.CV_32F, 0, 1) ** 2, (0, 0), 7)
    wgt = coh * np.sqrt(en)
    NB = 12
    b = np.floor(th / np.pi * NB + 0.5).astype(int) % NB
    dirs = []
    bb = np.zeros((Hh, Ww), np.int32)
    for c in sorted(set(np.unique(cls).tolist())):
        inside = ((cls == c) & (B > 0.04)).astype(np.float32)
        sm_c = env('DSMSKIN', 22) if c == CLS['skin'] else env('DSM', 11)
        votes = np.stack([cv2.GaussianBlur(((b == k) * wgt * inside).astype(np.float32), (0, 0), sm_c) for k in range(NB)])
        votes = votes + 0.5 * (np.roll(votes, 1, 0) + np.roll(votes, -1, 0))
        bc = votes.argmax(0)
        if c in FORCE: bc[:] = FORCE[c]
        bb[cls == c] = bc[cls == c]
        for k in range(NB):
            m = ((bc == k) & (cls == c) & ((B > 0.03) | (c != 0))).astype(np.float32)
            if m.sum() < 200: continue
            rings = m16.isolines(cv2.GaussianBlur(m, (0, 0), 1.0), 0.5, 2.0, 200, off)
            if rings: dirs.append((k, c, rings))
    json.dump([(k, c, [r.tolist() for r in rs]) for k, c, rs in dirs], open(WORK + '/room_dirs.json', 'w'))
    hsv = np.stack([(bb * 15).astype(np.uint8), np.full_like(bb, 200, dtype=np.uint8), (np.clip(B, 0.15, 1) * 255).astype(np.uint8)], 2)
    cv2.imwrite(WORK + '/room_dirs.jpg', cv2.resize(cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR), None, fx=0.5, fy=0.5))
    im = cv2.cvtColor((np.clip(E, 0, 1) * 255 / 3).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    for S, col in ((dh, (90, 90, 90)), (ph, (60, 90, 60)), (dark, (0, 0, 255)), (pale, (0, 255, 0))):
        for s in S:
            for i in range(1, len(s)):
                cv2.line(im, (int(s[i - 1][0] + M), int(s[i - 1][1] + M)), (int(s[i][0] + M), int(s[i][1] + M)), col, 1)
    cv2.imwrite(WORK + '/room_strokes.png', im)
elif mode == 'cal':
    # light matching against a raw (pre-grade) render of the room at the steady framing
    raw = cv2.imread(sys.argv[2], 0).astype(np.float32) / 255
    gain = float(sys.argv[3]) if len(sys.argv) > 3 else 0.8
    Vt = np.load(WORK + '/room_vt.npy')
    S = 4.0
    ref = E[M:M + 946, M:M + 2206]
    d = cv2.GaussianBlur(ref, (0, 0), S) - cv2.GaussianBlur(raw, (0, 0), S)
    d[raw.shape[0] - 3:, :] = 0
    D = np.zeros_like(Vt); D[M:M + 946, M:M + 2206] = d
    # the margins (never on screen at identity) take the nearest correction
    D = cv2.copyMakeBorder(D[M:M + 946, M:M + 2206], M, M, M, M, cv2.BORDER_REPLICATE)
    keep = (cls != CLS['clean']) & (cls != CLS['flat'])
    Vt = np.where(keep, np.clip(Vt + gain * D, 0, 1), Vt).astype(np.float32)
    np.save(WORK + '/room_vt.npy', Vt)
    print('cal: mean |diff| before %.4f' % np.abs(d).mean())

# write the JS from the saved pieces
Vt = np.load(WORK + '/room_vt.npy')
levels, _ = m16.value_levels(Vt, 0.6, TH, eps=2.0, minarea=60, off=off)
st = json.load(open(WORK + '/room_strokes.json'))
dirs = [(k, c, [np.array(r) for r in rs]) for k, c, rs in json.load(open(WORK + '/room_dirs.json'))]
print('levels', sum(len(r) for _, r in levels), 'rings; dirs', len(dirs), 'regions')
write_js(levels, dirs, st['dark'], st['pale'])
cv2.imwrite(WORK + '/room_vt.jpg', cv2.resize((Vt * 255).astype(np.uint8), None, fx=0.5, fy=0.5))
