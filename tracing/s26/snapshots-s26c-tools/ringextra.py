#!/usr/bin/env python3
# The D ring outside the traced cells: at 112.72 the source shows more (non-black) shard area than the 86 traced
# cells cover. Take the non-black region outside the colour window and outside the traced cells, split it along the
# traced outlines, keep components > 600 px, simplify (approxPolyDP 3 px), and give each the piece of OUR page whose
# tones match best (the ringlook.py search). Coordinates + transforms only. Scratch.
import cv2, numpy as np, json, sys
sys.path.insert(0, '.')
from grade import ungrade
M = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas'
F = 2818; Q = 4
raw = cv2.imread(f'{M}/src/{F}.png'); H, W = raw.shape[:2]
win = cv2.imread(f'{M}/win2818.png', 0) > 0
cells = json.load(open(f'{M}/ringcells.json')); segs = json.load(open(f'{M}/ringsegs.json'))
cm = np.zeros((H, W), np.uint8)
for c in cells: cv2.fillPoly(cm, [np.array(c['p'], np.float32).reshape(-1, 2).astype(np.int32)], 255)
lines = np.zeros((H, W), np.uint8)
for i in range(0, len(segs), 4): cv2.line(lines, (int(segs[i]), int(segs[i+1])), (int(segs[i+2]), int(segs[i+3])), 255, 5)
# bright thin lines in the frame itself (outlines not in the traced set)
g = cv2.cvtColor(raw, cv2.COLOR_BGR2GRAY)
th = cv2.morphologyEx(g, cv2.MORPH_TOPHAT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
lines[(th > 60)] = 255
owl = np.fromfile(f'/Users/computer/rootline/apprentice-film/snapshots/s26b-meas/fit/m/{F}.bin', np.uint8).reshape(473, 1103)
owl = cv2.dilate(cv2.resize(owl, (W, H)), np.ones((9, 9), np.uint8)) > 100
nonblack = cv2.GaussianBlur(raw, (0, 0), 2).max(2) >= 14
reg = (~win) & (cm == 0) & nonblack & (lines == 0) & (~owl)
reg = cv2.morphologyEx(reg.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
n, lab, st, cen = cv2.connectedComponentsWithStats(reg)
polys = []
for i in range(1, n):
    if st[i, 4] < 600: continue
    m = (lab == i).astype(np.uint8) * 255
    m = cv2.dilate(m, np.ones((5, 5), np.uint8))   # grow back over the line gap
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)
    ap = cv2.approxPolyDP(c, 3.0, True).reshape(-1, 2)
    if len(ap) >= 3: polys.append(ap.astype(float).tolist())
print(len(polys), 'extra shards; area', sum(cv2.contourArea(np.array(p, np.float32)) for p in polys))
# tone match against our page
src = ungrade(raw, F / 25)
our = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s26c-out/pages/r2500.png').astype(np.float32) / 255
def lab_(im): return cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32), (0, 0), 1.5), cv2.COLOR_BGR2LAB)
srcQ = lab_(cv2.resize(src, (W // Q, H // Q), interpolation=cv2.INTER_AREA)); ourQ = cv2.resize(our, (W // Q, H // Q), interpolation=cv2.INTER_AREA)
rng = np.random.default_rng(2827)
out = []
for k, p in enumerate(polys):
    P = np.array(p, np.float32)
    m = np.zeros((H // Q, W // Q), np.uint8); cv2.fillPoly(m, [(P / Q).astype(np.int32)], 1)
    if m.sum() < 6: continue
    ys, xs = np.nonzero(m); x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    mm = m[y0:y1, x0:x1] > 0; S = srcQ[y0:y1, x0:x1][mm]; cenP = P.mean(0)
    def mk(s, th, q):
        ct, sn = np.cos(th), np.sin(th); a, b, d, e = s * ct, -s * sn, s * sn, s * ct
        return [a, b, cenP[0] - (a * q[0] + b * q[1]), d, e, cenP[1] - (d * q[0] + e * q[1])]
    def cost(Mf):
        Aq = np.array(Mf, np.float64).reshape(2, 3).copy(); Aq[:, 2] = Aq[:, 2] / Q - np.array([x0, y0])
        wp = cv2.warpAffine(ourQ, Aq, (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR)
        return float(np.sqrt(((lab_(wp)[mm] - S) ** 2).sum(1)).mean())
    best = (1e9, None); par = None
    for i in range(500):
        s = rng.uniform(1.5, 2.7); th = np.radians(rng.uniform(-35, 35)); q = np.array([rng.uniform(170, 2020), rng.uniform(130, 930)])
        v = cost(mk(s, th, q))
        if v < best[0]: best = (v, mk(s, th, q)); par = (s, th, q)
    s, th, q = par
    for i in range(250):
        s2 = s * np.exp(rng.normal(0, 0.05)); th2 = th + rng.normal(0, 0.06); q2 = q + rng.normal(0, 12, 2)
        v = cost(mk(s2, th2, q2))
        if v < best[0]: best = (v, mk(s2, th2, q2)); s, th, q = s2, th2, q2
    out.append({'p': p, 'M': [float(x) for x in best[1]], 'dE': best[0]})
print('mean dE', np.mean([o['dE'] for o in out]))
json.dump(out, open(f'{M}/ringextra.json', 'w'))
