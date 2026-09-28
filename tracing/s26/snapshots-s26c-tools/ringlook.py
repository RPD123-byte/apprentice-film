#!/usr/bin/env python3
# D ring cells: pick, per traced cell, the similarity of OUR B&W page (bwPlain, stage px) whose low-frequency look
# (Lab, blurred) best matches the source cell on 112.72 (ungraded), by a seeded random search + local refinement,
# starting from the NCC-refined transform. The shards then show our own drawing where the source shows similar tones.
import cv2, numpy as np, json, sys
sys.path.insert(0, '.')
from grade import ungrade
M = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas'
F = 2818; Q = 4   # work at 1/4 resolution
src = ungrade(cv2.imread(f'{M}/src/{F}.png'), F / 25)
our = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s26c-out/pages/r2500.png').astype(np.float32) / 255
H, W = src.shape[:2]
def lab(im): return cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32), (0, 0), 1.5), cv2.COLOR_BGR2LAB)
srcQ = lab(cv2.resize(src, (W // Q, H // Q), interpolation=cv2.INTER_AREA))
ourQ = cv2.resize(our, (W // Q, H // Q), interpolation=cv2.INTER_AREA)
cells = json.load(open(f'{M}/ringcells.json'))
ref = json.load(open(f'{M}/ringrefine_stageA.json'))
segs = json.load(open(f'{M}/ringsegs.json'))
bad = np.zeros((H // Q, W // Q), np.uint8)
owl = np.fromfile(f'/Users/computer/rootline/apprentice-film/snapshots/s26b-meas/fit/m/{F}.bin', np.uint8).reshape(473, 1103)
bad[cv2.resize(owl, (W // Q, H // Q)) > 100] = 1
rng = np.random.default_rng(2826)
out = {}
tot0 = tot1 = area = 0
for k, c in enumerate(cells):
    if c['lab'] == 1: continue
    P = np.array(c['p'], np.float32).reshape(-1, 2)
    m = np.zeros((H // Q, W // Q), np.uint8); cv2.fillPoly(m, [(P / Q).astype(np.int32)], 1); m[bad > 0] = 0
    if m.sum() < 6: continue
    ys, xs = np.nonzero(m); x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    mm = m[y0:y1, x0:x1] > 0; S = srcQ[y0:y1, x0:x1][mm]
    cen = P.mean(0)
    def cost(Mf):
        A = np.array(Mf, np.float64).reshape(2, 3).copy(); A[:, 2] /= Q
        A[:, 2] += A[:, :2] @ np.zeros(2); A[0, 2] -= x0; A[1, 2] -= y0
        # stage px (quarter) -> cell box: frame = A_full * stage ; at quarter res both sides scale by 1/Q
        Aq = np.array(Mf, np.float64).reshape(2, 3).copy(); Aq[:, 2] = Aq[:, 2] / Q - np.array([x0, y0])
        wp = cv2.warpAffine(ourQ, Aq, (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0))
        L = lab(wp)[mm]
        return float(np.sqrt(((L - S) ** 2).sum(1)).mean())
    def mk(s, th, q):
        ct, sn = np.cos(th), np.sin(th); a, b, d, e = s * ct, -s * sn, s * sn, s * ct
        return [a, b, cen[0] - (a * q[0] + b * q[1]), d, e, cen[1] - (d * q[0] + e * q[1])]
    def dec(Mf):
        a, b, tx, d, e, ty = Mf; s = np.hypot(a, d); th = np.arctan2(d, a)
        q = np.linalg.solve(np.array([[a, b], [d, e]]), cen - np.array([tx, ty])); return s, th, q
    start = ref.get(str(k))[1] if ref.get(str(k)) else c['M']
    best = (cost(start), start); c0 = best[0]
    for i in range(500):
        s = rng.uniform(1.5, 2.7); th = np.radians(rng.uniform(-35, 35)); q = np.array([rng.uniform(170, 2020), rng.uniform(130, 930)])
        Mf = mk(s, th, q); v = cost(Mf)
        if v < best[0]: best = (v, Mf)
    s, th, q = dec(best[1])
    for i in range(250):
        s2 = s * np.exp(rng.normal(0, 0.05)); th2 = th + rng.normal(0, 0.06); q2 = q + rng.normal(0, 12, 2)
        Mf = mk(s2, th2, q2); v = cost(Mf)
        if v < best[0]: best = (v, Mf); s, th, q = s2, th2, q2
    out[k] = [float(x) for x in (start if c0 <= best[0] + 3.0 else best[1])]
    a = float(mm.sum()); tot0 += c0 * a; tot1 += min(c0, best[0] + 3.0) * a if c0 <= best[0] + 3.0 else best[0] * a; area += a
    print(k, 'dE %.1f -> %.1f' % (c0, best[0]), 's %.2f th %.0f' % (s, np.degrees(th)))
print('area-weighted dE in cells: %.2f -> %.2f' % (tot0 / area, tot1 / area))
json.dump(out, open(f'{M}/ringlook.json', 'w'))
