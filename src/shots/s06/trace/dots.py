#!/usr/bin/env python3
# dots.py cfg.json out.json dbg.png — small bright marks on the dark room (grille mesh dots, cable dashes), measured:
# local maxima of a scale-normalised LoG of the brightness above the local dark ground; each dot is centre, size along
# and across (Hessian eigenvalues), direction, and its ungraded peak value and ground. (Measurement only.)
import cv2, numpy as np, json, sys
from skimage.feature import hessian_matrix, peak_local_max
cfg = json.load(open(sys.argv[1])); out, dbg = sys.argv[2], sys.argv[3]
pre = np.load(cfg['src']).astype(np.float32); pre = pre / 255 if pre.max() > 1.01 else pre
H, W = pre.shape
def poly(pts, grow=0):
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.array(pts, np.int32)], 1)
    if grow: m = cv2.dilate(m, np.ones((2 * grow + 1,) * 2, np.uint8))
    return m
region = np.ones((H, W), np.uint8)
if cfg.get('include'):
    region[:] = 0
    for pp in cfg['include']: region |= poly(pp)
for pp in cfg.get('exclude', []):
    pts, grow = (pp[0], pp[1]) if isinstance(pp[0][0], list) else (pp, 0)
    region[poly(pts, grow) > 0] = 0
g = cv2.GaussianBlur(pre, (0, 0), 0.6)
k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
ground = cv2.GaussianBlur(cv2.dilate(cv2.erode(g, k), k), (0, 0), 1.5)   # opening: the dark ground without the dots
br = np.clip(g - ground, 0, None)
best = np.zeros_like(br); sc = np.zeros_like(br)
for s in cfg.get('sigmas', [0.9, 1.4]):
    L = -cv2.Laplacian(cv2.GaussianBlur(br, (0, 0), s), cv2.CV_32F) * s * s
    upd = L > best; best[upd] = L[upd]; sc[upd] = s
best[region == 0] = 0
pk = peak_local_max(best, min_distance=cfg.get('min_dist', 2), threshold_abs=cfg.get('thr', 0.03))
Hm = hessian_matrix(cv2.GaussianBlur(br, (0, 0), 1.0), sigma=0.8, order='rc', use_gaussian_derivatives=False)
res = []
for (y, x) in pk:
    hrr, hrc, hcc = Hm[0][y, x], Hm[1][y, x], Hm[2][y, x]
    tr = hrr + hcc; det = hrr * hcc - hrc * hrc; disc = np.sqrt(max(0, tr * tr / 4 - det))
    l1, l2 = abs(tr / 2 + disc), abs(tr / 2 - disc)
    a = 0.5 * np.arctan2(2 * hrc, hcc - hrr)
    el = min(4.0, np.sqrt(max(l1, l2) / max(1e-5, min(l1, l2))))
    s = sc[y, x]; w = 1.7 * s; ln = w * el
    res.append([int(x), int(y), round(float(ln), 1), round(float(w), 1), round(float(a), 2), round(float(g[y, x]), 3), round(float(ground[y, x]), 3)])
if cfg.get('pitch_size') and len(res) > 3:
    # mesh cells: size from the spacing to the nearest neighbours (the cells fill most of the pitch)
    from scipy.spatial import cKDTree
    P = np.array([[r[0], r[1]] for r in res], float); dd, _ = cKDTree(P).query(P, k=3)
    for r, d in zip(res, dd[:, 1:].mean(1)):
        sz = float(np.clip(cfg['pitch_size'] * d, 1.5, 5.0))
        r[2] = round(max(r[2], sz), 1); r[3] = round(max(r[3], sz * 0.9), 1)
json.dump(res, open(out, 'w'))
im = cv2.cvtColor((np.clip(pre, 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR) // 2
for x, y, ln, w, a, v, b in res:
    cv2.circle(im, (x, y), 1, (0, 255, 255), -1)
bx = cfg.get('dbgbox', [0, 0, W, H])
cv2.imwrite(dbg, cv2.resize(im[bx[1]:bx[3], bx[0]:bx[2]], None, fx=cfg.get('dbgzoom', 1), fy=cfg.get('dbgzoom', 1), interpolation=cv2.INTER_NEAREST))
print(len(res), 'dots')
