#!/usr/bin/env python3
# s26 fix #2, beat D: per ring shard and source frame, does the source show OUR arriving colour page inside the shard
# (moved by the ring's measured motion)? -> the frame from which each shard is clear glass / has flown off.
# Measurement only (coordinates and frame numbers). Output: s26-fix2-meas/ringclear.json {k: [fraction per F]}
import cv2, numpy as np, json, re, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s26c-tools')
from grade import ungrade
R = '/Users/computer/rootline/apprentice-film'
src_js = open(f'{R}/src/shots/s26.js').read()
ring = [list(map(float, m)) for m in re.findall(r'\[(28\d\d), ([\d.]+), ([-\d.]+), ([-\d.]+)\]', src_js)]
ring = {int(r[0]): r[1:] for r in ring}
cells = [list(map(float, m.split(','))) for m in re.findall(r'^\s*\[([-\d.,]+)\],$', open(f'{R}/src/shots/s26/ringD2.js').read(), re.M)]
W, H, Q = 2206, 946, 2
lab = lambda im: cv2.cvtColor(cv2.GaussianBlur(cv2.resize(im, (W // Q, H // Q), interpolation=cv2.INTER_AREA), (0, 0), 2.0), cv2.COLOR_BGR2LAB)
out = {k: {} for k in range(len(cells))}
for F in range(2818, 2843):
    s, tx, ty = ring[F]
    S = lab(ungrade(cv2.imread(f'{R}/snapshots/s26c-meas/src/{F}.png'), F / 25))
    P = lab(cv2.imread(f'{R}/snapshots/s26-fix2-meas/pages/r{F}.png').astype(np.float32) / 255)
    d = np.sqrt(((S - P) ** 2).sum(2))
    ok = d < 14
    for k, c in enumerate(cells):
        pts = np.array(c[7:]).reshape(-1, 2) * s + [tx, ty]
        m = np.zeros((H // Q, W // Q), np.uint8); cv2.fillPoly(m, [(pts / Q).round().astype(np.int32)], 1)
        m = cv2.erode(m, np.ones((5, 5), np.uint8))
        n = int(m.sum())
        if n < 30: continue
        out[k][F] = round(float(ok[m > 0].mean()), 3)
json.dump({'cells': out}, open(f'{R}/snapshots/s26-fix2-meas/ringclear.json', 'w'))
# summary for the left third
for k, c in enumerate(cells):
    pts = np.array(c[7:]).reshape(-1, 2); cx, cy = pts.mean(0)
    if cx > 900: continue
    v = out[k]; row = ' '.join(f'{v.get(F, -1):.2f}'[1:] if v.get(F, -1) >= 0 else '  - ' for F in range(2818, 2843, 2))
    print(f'{k:3d} t{int(c[0])} c=({cx:4.0f},{cy:4.0f}) {row}')
