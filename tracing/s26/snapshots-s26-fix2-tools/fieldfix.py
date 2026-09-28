#!/usr/bin/env python3
# s26 fix #2, beat C: re-pick the content of the lower-half field shards (field coords = the 112.00 frame):
#  * shards showing headline letters or the nav labels (a piece of the banner's headline / the nav row) get a new
#    piece: the colour strip without the headline, or the B&W page away from text / the designer's face;
#  * shards where the source is clearly more colourful than our piece get a colour-strip piece (the rainbow / clouds
#    of the banner, any rotation) when it matches the source cell's blurred tones better.
# Measurement only (writes transforms of our own page). Rewrites src/shots/s26/fieldC2.js in place (cells only).
import cv2, numpy as np, re, sys, json
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s26c-tools')
from grade import ungrade
R = '/Users/computer/rootline/apprentice-film'
W, H, Q, F = 2206, 946, 4, 2800
js = open(f'{R}/src/shots/s26/fieldC2.js').read()
rows = re.findall(r'^  \[([-\d.,]+)\],$', js, re.M)
cells = [list(map(float, r.split(','))) for r in rows]
src = ungrade(cv2.imread(f'{R}/snapshots/s26c-meas/src/{F}.png'), F / 25)
small = lambda im: cv2.resize(im, (W // Q, H // Q), interpolation=cv2.INTER_AREA)
labf = lambda im: cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32), (0, 0), 1.5), cv2.COLOR_BGR2LAB)
Ssm = small(src); SL = labf(Ssm)
bw = small(cv2.imread(f'{R}/snapshots/s26-fix1-meas/pages/r2500.png').astype(np.float32) / 255)
chroma = lambda im: (im.max(2) - im.min(2)) > 0.2
TEXT = [(850, 186, 1560, 362), (150, 128, 2060, 184)]          # banner headline; nav row + logo (bwPlain frame px)
FACE = (968, 310, 1134, 462)
owl = np.fromfile(f'{R}/snapshots/s26b-meas/fit/m/{F}.bin', np.uint8).reshape(473, 1103)
owl = cv2.resize(owl, (W // Q, H // Q)) > 100
def M_of(c): return np.array([[c[1], c[2], c[3]], [c[4], c[5], c[6]]])
def warp(img, A, box):
    x0, y0, x1, y1 = box; Aq = A.copy(); Aq[:, 2] = Aq[:, 2] / Q - np.array([x0, y0])
    return cv2.warpAffine(img, Aq, (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR, borderValue=0)
def simA(s, th, q, cen):
    ct, sn = np.cos(th), np.sin(th); a, b, dd, e = s * ct, -s * sn, s * sn, s * ct
    return np.array([[a, b, cen[0] - (a * q[0] + b * q[1])], [dd, e, cen[1] - (dd * q[0] + e * q[1])]])
def overlap(A, P, box):
    Ai = cv2.invertAffineTransform(A); Pp = P @ Ai[:, :2].T + Ai[:, 2]
    m = np.zeros((H // 2, W // 2), np.uint8); cv2.fillPoly(m, [(Pp / 2).round().astype(np.int32)], 1)
    x0, y0, x1, y1 = [v // 2 for v in box]; tot = m.sum()
    return m[y0:y1, x0:x1].sum() / tot if tot else 0
rng = np.random.default_rng(2026)
changed = {'text': 0, 'colour': 0}; log = []
for k, c in enumerate(cells):
    if c[0] != 0: continue
    P = np.array(c[7:]).reshape(-1, 2); cen = P.mean(0)
    if cen[1] <= 473: continue
    A0 = M_of(c)
    text = max(overlap(A0, P, b) for b in TEXT) > 0.04
    m = np.zeros((H // Q, W // Q), np.uint8); cv2.fillPoly(m, [(P / Q).round().astype(np.int32)], 1); m[owl] = 0
    ys, xs = np.nonzero(m)
    if len(xs) < 4: continue
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1); mm = m[box[1]:box[3], box[0]:box[2]] > 0
    Sc = SL[box[1]:box[3], box[0]:box[2]][mm]; srcSat = chroma(Ssm[box[1]:box[3], box[0]:box[2]])[mm].mean()
    def cost(A):
        wv = warp(bw, A, box)
        return float(np.sqrt(((labf(wv)[mm] - Sc) ** 2).sum(1)).mean()), chroma(wv)[mm].mean()
    c0, sat0 = cost(A0)
    if not text and not (srcSat - sat0 > 0.15): continue
    best = (1e9 if text else c0, None)
    s0 = np.hypot(c[1], c[2])
    for it in range(260):
        strip = it % 2 == 0 or not text
        s = s0 * np.exp(rng.normal(0, 0.1)); th = rng.uniform(-np.pi, np.pi) if strip else np.arctan2(c[4], c[1]) + rng.normal(0, 0.15)
        if strip:
            q = np.array([rng.uniform(200, 840) if rng.random() < 0.5 else rng.uniform(1570, 1960), rng.uniform(196, 352)])
        else:
            q = np.array([rng.uniform(180, 2020), rng.uniform(380, 890)])
        A = simA(s, th, q, cen)
        if any(overlap(A, P, b) > 0.02 for b in TEXT) or overlap(A, P, FACE) > 0.02: continue
        v, sat = cost(A)
        if v < best[0]: best = (v, A)
    if best[1] is None: continue
    A = best[1]
    cells[k] = [0, *[round(float(v), 5) for v in (A[0, 0], A[0, 1], A[0, 2], A[1, 0], A[1, 1], A[1, 2])], *c[7:]]
    changed['text' if text else 'colour'] += 1
    log.append((k, 'text' if text else 'colour', round(c0, 1), round(best[0], 1), round(float(srcSat), 2), round(float(sat0), 2)))
for l in log: print(l)
print(changed)
fmt = lambda v: str(int(v)) if float(v).is_integer() else str(v)
new = [f"  [{','.join(fmt(v) for v in c)}]," for c in cells]
it = iter(new)
js2 = re.sub(r'^  \[([-\d.,]+)\],$', lambda m: next(it), js, flags=re.M)
open(f'{R}/src/shots/s26/fieldC2.js', 'w').write(js2)
