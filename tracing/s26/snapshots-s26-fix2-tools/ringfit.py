#!/usr/bin/env python3
# s26 fix #2, beat D: per ring shard, the source frame from which it no longer covers the arriving colour page (clear
# glass or flown off): the switch frame Fc minimising sum_{F<Fc} err(our shard) + sum_{F>=Fc} (err(page) + margin),
# err = mean CIE76 dE (sigma 4, half res) against the ungraded source inside the shard moved by the ring's motion.
# Measurement only. Output: s26-fix2-meas/ringfit.json {k: Fc}
import cv2, numpy as np, json, re, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s26c-tools')
from grade import ungrade
R = '/Users/computer/rootline/apprentice-film'
src_js = open(f'{R}/src/shots/s26.js').read()
ring = {int(m[0]): list(map(float, m[1:])) for m in re.findall(r'\[(28\d\d), ([\d.]+), ([-\d.]+), ([-\d.]+)\]', src_js)}
cells = [list(map(float, m.split(','))) for m in re.findall(r'^\s*\[([-\d.,]+)\],$', open(f'{R}/src/shots/s26/ringD2.js').read(), re.M)]
W, H, Q = 2206, 946, 2
MARGIN = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
lab = lambda im: cv2.cvtColor(cv2.GaussianBlur(cv2.resize(im, (W // Q, H // Q), interpolation=cv2.INTER_AREA), (0, 0), 2.0), cv2.COLOR_BGR2LAB)
FR = list(range(2818, 2843))
es = np.full((len(cells), len(FR)), np.nan); ec = np.full_like(es, np.nan)
excl = np.zeros((H // Q, W // Q), bool); excl[100 // Q:820 // Q, 700 // Q:1600 // Q] = True
for j, F in enumerate(FR):
    s, tx, ty = ring[F]
    S = lab(ungrade(cv2.imread(f'{R}/snapshots/s26c-meas/src/{F}.png'), F / 25))
    P = lab(cv2.imread(f'{R}/snapshots/s26-fix2-meas/pages/r{F}.png').astype(np.float32) / 255)
    O = lab(cv2.imread(f'{R}/snapshots/s26-fix2-meas/ringonly/r{F}.png').astype(np.float32) / 255)
    dP = np.sqrt(((S - P) ** 2).sum(2)); dO = np.sqrt(((S - O) ** 2).sum(2))
    for k, c in enumerate(cells):
        pts = np.array(c[7:]).reshape(-1, 2) * s + [tx, ty]
        m = np.zeros((H // Q, W // Q), np.uint8); cv2.fillPoly(m, [(pts / Q).round().astype(np.int32)], 1)
        m = cv2.erode(m, np.ones((3, 3), np.uint8)).astype(bool) & ~excl
        if m.sum() < 40: continue
        es[k, j] = dO[m].mean(); ec[k, j] = dP[m].mean()
fit = {}
for k in range(len(cells)):
    v = ~np.isnan(es[k])
    if v.sum() < 3: continue
    best, bF = None, None
    for jc in range(len(FR) + 1):
        a = es[k, :jc][v[:jc]].sum() + (ec[k, jc:][v[jc:]] + MARGIN).sum()
        if best is None or a < best: best, bF = a, (FR[jc] if jc < len(FR) else 2843)
    jc = FR.index(bF) if bF < 2843 else len(FR)
    gain = float(np.nansum((es[k] - ec[k] - MARGIN)[jc:]))
    GMIN = float(sys.argv[2]) if len(sys.argv) > 2 else 20
    pts = np.array(cells[k][7:]).reshape(-1, 2); cx, cy = pts.mean(0)
    if bF < 2843 and gain >= GMIN:
        fit[k] = bF
        print(f'{k:3d} t{int(cells[k][0])} c=({cx:4.0f},{cy:4.0f}) Fc={bF} gain={gain:.1f}  frames={int(v[jc:].sum())}')
json.dump(fit, open(f'{R}/snapshots/s26-fix2-meas/ringfit.json', 'w'))
print(len(fit), 'cells switch')
