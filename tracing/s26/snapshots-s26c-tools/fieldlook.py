#!/usr/bin/env python3
# C shard field: per traced cell, keep its measured content (B&W page + shift, or colour page + shift) unless a piece
# of OUR B&W or colour page under another similarity matches the cell's blurred tones on the 112.00 frame better by more
# than 3 dE (seeded search, 1/4 res, ungraded source). Measurement only; the render draws our own pages.
import cv2, numpy as np, json, sys
sys.path.insert(0, '.')
from grade import ungrade
M = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas'; O = '/Users/computer/rootline/apprentice-film/snapshots/s26c-out'
F = 2800; Q = 4; W, H = 2206, 946
src = ungrade(cv2.imread(f'{M}/src/{F}.png'), F / 25)
def lab(im): return cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32), (0, 0), 1.5), cv2.COLOR_BGR2LAB)
S = lab(cv2.resize(src, (W // Q, H // Q), interpolation=cv2.INTER_AREA))
bw = cv2.resize(cv2.imread(f'{O}/pages2/r2500.png').astype(np.float32) / 255, (W // Q, H // Q), interpolation=cv2.INTER_AREA)
col = cv2.resize(cv2.imread(f'{O}/pages2/r2550.png').astype(np.float32) / 255, (W // Q, H // Q), interpolation=cv2.INTER_AREA)
d = json.load(open(f'{M}/fieldC.json'))
Mb = np.array(d['Mb'], float).reshape(2, 3); Mc = np.array(d['Mc'], float).reshape(2, 3)
owl = np.fromfile(f'/Users/computer/rootline/apprentice-film/snapshots/s26b-meas/fit/m/{F}.bin', np.uint8).reshape(473, 1103)
owl = cv2.resize(owl, (W // Q, H // Q)) > 100
segs = d['segs']; lines = np.zeros((H // Q, W // Q), np.uint8)
for i in range(0, len(segs), 4): cv2.line(lines, (int(segs[i] / Q), int(segs[i+1] / Q)), (int(segs[i+2] / Q), int(segs[i+3] / Q)), 1, 1)
rng = np.random.default_rng(2800)
def warp(img, A, box):
    x0, y0, x1, y1 = box; Aq = A.copy(); Aq[:, 2] = Aq[:, 2] / Q - np.array([x0, y0])
    return cv2.warpAffine(img, Aq, (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR)
def simA(s, th, q, cen):
    ct, sn = np.cos(th), np.sin(th); a, b, dd, e = s * ct, -s * sn, s * sn, s * ct
    return np.array([[a, b, cen[0] - (a * q[0] + b * q[1])], [dd, e, cen[1] - (dd * q[0] + e * q[1])]])
out = {}; tot0 = tot1 = area = 0; nch = 0
for k, c in enumerate(d['cells']):
    if c['lab'] == 2 or (c['lab'] == 1 and c['dx'] == 0 and c['dy'] == 0): continue
    P = np.array(c['p'], np.float32).reshape(-1, 2)
    m = np.zeros((H // Q, W // Q), np.uint8); cv2.fillPoly(m, [(P / Q).astype(np.int32)], 1); m[owl] = 0; m[lines > 0] = 0
    if m.sum() < 8: continue
    ys, xs = np.nonzero(m); box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1); mm = m[box[1]:box[3], box[0]:box[2]] > 0
    Sc = S[box[1]:box[3], box[0]:box[2]][mm]; cen = P.mean(0)
    cost = lambda img, A: float(np.sqrt(((lab(warp(img, A, box))[mm] - Sc) ** 2).sum(1)).mean())
    base = (Mb if c['lab'] == 0 else Mc).copy(); base[:, 2] += [c['dx'], c['dy']]
    c0 = cost(bw if c['lab'] == 0 else col, base)
    best = (c0, None)
    for which, img, s0 in ((0, bw, 1.128), (1, col, 0.84)):
        for i in range(220):
            s = s0 * np.exp(rng.normal(0, 0.08)); th = rng.normal(0, 0.12); q = np.array([rng.uniform(0, W), rng.uniform(0, H)])
            if which == 1: q = np.array([rng.uniform(0, 2206), rng.uniform(0, 946)])
            # q: source-image point mapped to the cell centre; source image coords = frame coords of bwPlain / colour page px
            A = simA(s, th, q, cen); v = cost(img, A)
            if v < best[0] - 1e-9: best = (v, (which, A, s, th, q))
    if best[1] is not None:
        which, A, s, th, q = best[1]; img = bw if which == 0 else col
        for i in range(150):
            s2 = s * np.exp(rng.normal(0, 0.03)); th2 = th + rng.normal(0, 0.04); q2 = q + rng.normal(0, 10, 2)
            A2 = simA(s2, th2, q2, cen); v = cost(img, A2)
            if v < best[0]: best = (v, (which, A2, s2, th2, q2)); s, th, q = s2, th2, q2
    a = float(mm.sum())
    if best[1] is not None and best[0] < c0 - 3.0:
        which, A = best[1][0], best[1][1]
        out[k] = [3 + which] + [float(x) for x in A.reshape(-1)]; nch += 1; tot1 += best[0] * a
    else: tot1 += c0 * a
    tot0 += c0 * a; area += a
print('changed', nch, 'of', len(d['cells']), 'area-weighted dE %.2f -> %.2f' % (tot0 / area, tot1 / area))
json.dump(out, open(f'{M}/fieldlook.json', 'w'))
