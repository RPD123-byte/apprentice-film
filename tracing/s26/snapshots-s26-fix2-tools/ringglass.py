#!/usr/bin/env python3
# s26 fix #2, beat D: ring shards that show the arriving colour page through the glass, displaced (the source's
# upper-left / right shards show pieces of the colour page — rainbow, plant, sign — shifted from where the page is).
# Per shard not already cleared (RING_CLEAR), per source frame 2818..2842: error of our shard vs of our page shifted by
# (dx, dy) (grid -240..240 step 30), inside the shard moved by the ring's measured motion (sigma 4, half res, ungraded
# source). Model: shard before Fg, displaced page from Fg. Accept if it beats the shard by >= 25 dE-frames (margin 1).
# Measurement only. Output: s26-fix2-meas/ringglass.json {k: [Fg, dx, dy]}
import cv2, numpy as np, json, re, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s26c-tools')
from grade import ungrade
R = '/Users/computer/rootline/apprentice-film'
src_js = open(f'{R}/src/shots/s26.js').read()
ring = {int(m[0]): list(map(float, m[1:])) for m in re.findall(r'\[(28\d\d), ([\d.]+), ([-\d.]+), ([-\d.]+)\]', src_js)}
cells = [list(map(float, m.split(','))) for m in re.findall(r'^\s*\[([-\d.,]+)\],$', open(f'{R}/src/shots/s26/ringD2.js').read(), re.M)]
clear = {int(k): v for k, v in re.findall(r'(\d+): (\d+)', open(f'{R}/src/shots/s26/ringClear.js').read().split('RING_CLEAR = ')[1])}
W, H, Q = 2206, 946, 2
w, h = W // Q, H // Q
lab = lambda im: cv2.cvtColor(cv2.GaussianBlur(cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA), (0, 0), 2.0), cv2.COLOR_BGR2LAB)
FR = list(range(2818, 2843))
SH = [(dx, dy) for dx in range(-240, 241, 30) for dy in range(-240, 241, 30)]
K = len(cells)
es = np.full((K, len(FR)), np.nan); eg = np.full((K, len(FR), len(SH)), np.nan)
excl = np.zeros((h, w), bool); excl[100 // Q:820 // Q, 700 // Q:1600 // Q] = True
cand = [k for k in range(K) if k not in clear]
for j, F in enumerate(FR):
    s, tx, ty = ring[F]
    S = lab(ungrade(cv2.imread(f'{R}/snapshots/s26c-meas/src/{F}.png'), F / 25))
    Pg = cv2.imread(f'{R}/snapshots/s26-fix2-meas/pages/r{F}.png').astype(np.float32) / 255
    O = lab(cv2.imread(f'{R}/snapshots/s26-fix2-meas/ringonly/r{F}.png').astype(np.float32) / 255)
    labim = np.full((h, w), -1, np.int32)
    for k in cand:
        pts = (np.array(cells[k][7:]).reshape(-1, 2) * s + [tx, ty]) / Q
        m = np.zeros((h, w), np.uint8); cv2.fillPoly(m, [pts.round().astype(np.int32)], 1)
        m = cv2.erode(m, np.ones((3, 3), np.uint8)).astype(bool) & ~excl
        labim[m] = k
    v = labim >= 0; L = labim[v]
    cnt = np.bincount(L, minlength=K).astype(float); ok = cnt >= 40
    dO = np.sqrt(((S - O) ** 2).sum(2))[v]
    es[ok, j] = (np.bincount(L, dO, minlength=K) / np.maximum(cnt, 1))[ok]
    for i, (dx, dy) in enumerate(SH):
        M = np.float32([[1, 0, dx], [0, 1, dy]])
        Ps = lab(cv2.warpAffine(Pg, M, (W, H), borderValue=0))
        dP = np.sqrt(((S - Ps) ** 2).sum(2))[v]
        eg[ok, j, i] = (np.bincount(L, dP, minlength=K) / np.maximum(cnt, 1))[ok]
    print('F', F, flush=True)
out = {}
for k in cand:
    vv = ~np.isnan(es[k])
    if vv.sum() < 4: continue
    best = (0, None)
    for i in range(len(SH)):
        d = es[k] - eg[k, :, i] - 1.0
        for jc in range(len(FR)):
            g = np.nansum(d[jc:][vv[jc:]])
            if g > best[0]: best = (g, (FR[jc], SH[i]))
    if best[1] and best[0] >= 25:
        Fg, (dx, dy) = best[1]
        pts = np.array(cells[k][7:]).reshape(-1, 2); cx, cy = pts.mean(0)
        out[k] = [Fg, dx, dy]
        print(f'{k:3d} c=({cx:4.0f},{cy:4.0f}) Fg={Fg} d=({dx},{dy}) gain={best[0]:.0f}')
json.dump(out, open(f'{R}/snapshots/s26-fix2-meas/ringglass.json', 'w'))
print(len(out), 'cells')
