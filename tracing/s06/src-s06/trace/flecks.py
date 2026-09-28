#!/usr/bin/env python3
# flecks.py cfg.json out.json dbg.png — stubble flecks (measurement only): small dark blobs found as local maxima of a
# scale-normalised Laplacian-of-Gaussian of the darkness (sigma ~1-1.6 px) inside the include polygons; each fleck is
# centre, length and width (from the Hessian eigenvalues), direction, and the ungraded value at the centre / ground.
# cfg: {"src": pre.npy, "mask_src": graded.npy, "box": [...], "include": [...], "exclude": [...], "sigmas": [1.0, 1.5],
#       "thr": 0.04, "min_dist": 3}
import cv2, numpy as np, json, sys, os
from skimage.feature import hessian_matrix, hessian_matrix_eigvals, peak_local_max
cfg = json.load(open(sys.argv[1])); out, dbg = sys.argv[2], sys.argv[3]
pre = np.load(cfg['src']).astype(np.float32); pre = pre / 255 if pre.max() > 1.01 else pre
H, W = pre.shape
x0, y0, x1, y1 = cfg['box']
def poly(pts, grow=0):
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.array(pts, np.int32)], 1)
    if grow: m = cv2.dilate(m, np.ones((2 * grow + 1,) * 2, np.uint8))
    return m
region = np.zeros((H, W), np.uint8)
for pp in cfg['include']: region |= poly(pp)
for pp in cfg.get('exclude', []):
    pts, grow = (pp[0], pp[1]) if isinstance(pp[0][0], list) else (pp, 0)
    region[poly(pts, grow) > 0] = 0
g = cv2.GaussianBlur(pre, (0, 0), 0.7)
k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
ground = cv2.GaussianBlur(cv2.erode(cv2.dilate(g, k), k), (0, 0), 2)
dark = np.clip(ground - g, 0, None)
best = np.zeros_like(dark); sc = np.zeros_like(dark)
for s in cfg.get('sigmas', [1.0, 1.5]):
    L = -cv2.Laplacian(cv2.GaussianBlur(dark, (0, 0), s), cv2.CV_32F) * s * s
    upd = L > best; best[upd] = L[upd]; sc[upd] = s
best[region == 0] = 0
pk = peak_local_max(best, min_distance=cfg.get('min_dist', 3), threshold_abs=cfg.get('thr', 0.04))
Hm = hessian_matrix(cv2.GaussianBlur(dark, (0, 0), 1.2), sigma=1.0, order='rc', use_gaussian_derivatives=False)
res = []
for (y, x) in pk:
    if not (x0 <= x < x1 and y0 <= y < y1): continue
    hrr, hrc, hcc = Hm[0][y, x], Hm[1][y, x], Hm[2][y, x]
    # direction along the fleck = eigenvector of the smaller-magnitude curvature
    tr = hrr + hcc; det = hrr * hcc - hrc * hrc; disc = np.sqrt(max(0, tr * tr / 4 - det))
    l1, l2 = tr / 2 + disc, tr / 2 - disc     # l2 most negative for a dark blob on the darkness map? (dark map: bright blob -> negative)
    a = 0.5 * np.arctan2(2 * hrc, hcc - hrr)   # angle of the principal axis (x = col, y = row)
    el = min(3.0, np.sqrt(max(abs(l1), abs(l2)) / max(1e-4, min(abs(l1), abs(l2)))))
    s = sc[y, x]; w = 1.6 * s; ln = w * el * 1.2 + 1.0
    res.append([int(x), int(y), round(float(ln), 1), round(float(w), 1), round(float(a), 2), round(float(g[y, x]), 3), round(float(ground[y, x]), 3)])
json.dump(res, open(out, 'w'))
im = cv2.cvtColor((np.clip(pre, 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
for x, y, ln, w, a, v, b in res:
    dx, dy = np.cos(a) * ln / 2, np.sin(a) * ln / 2
    cv2.line(im, (int(x - dx), int(y - dy)), (int(x + dx), int(y + dy)), (0, 0, 255), 1)
cv2.imwrite(dbg, cv2.resize(im[y0:y1, x0:x1], None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST))
print(len(res), 'flecks')
