#!/usr/bin/env python3
# Pass 4: the fine dark lines of a held owl drawing that the traced tone regions lose (feather separations, the
# brow, the eye, the band's edges). Measuring only — writes control points (centre-lines with a width and a
# multiply factor per point), no pixels.
#   trace_lines.py SRC_MED.png RENDER_MED.png out.json dbg.jpg [X0 Y0 S HI LO MINLEN [hp]]
# SRC_MED / RENDER_MED: the source's and this film's median of the drawing in drawing-local coordinates at S× (both
# post-grade, the same crop). The residual D = render − source (> 0 where the source is darker) is searched for
# thin dark ridges (Hessian, σ 3 and 5 at 4×), inside the owl (eroded, so silhouette edges are not taken), hysteresis-
# thresholded, skeletonised, chained, smoothed and RDP-simplified. Each point stores its width (FWHM of the residual
# across the line, frame px) and a multiply factor k = pre-grade(source core) / pre-grade(render there).
import cv2, numpy as np, json, sys
from skimage.morphology import skeletonize, remove_small_objects
from skimage.filters import apply_hysteresis_threshold
from skimage.feature import hessian_matrix, hessian_matrix_eigvals
a = sys.argv[1:]
S0 = cv2.imread(a[0], 0).astype(np.float32); R0 = cv2.imread(a[1], 0).astype(np.float32)
X0, Y0, SC = (float(a[4]), float(a[5]), float(a[6])) if len(a) > 6 else (-140, -80, 4)
HI, LO, MINL = (float(a[7]), float(a[8]), float(a[9])) if len(a) > 9 else (6, 3, 16)
H, W = S0.shape
Sb = cv2.GaussianBlur(S0, (0, 0), 1.0); Rb = cv2.GaussianBlur(R0, (0, 0), 1.0)
D = Rb - Sb
if len(a) > 10 and a[10] == 'hp': D = D - cv2.GaussianBlur(D, (0, 0), 3 * SC)   # local residual (the margin's white cap offsets it)
owl = (cv2.GaussianBlur(S0, (0, 0), 6) > 140).astype(np.uint8) & (cv2.GaussianBlur(R0, (0, 0), 6) > 140).astype(np.uint8)
owl = cv2.erode(owl, np.ones((int(3 * SC) | 1, int(3 * SC) | 1), np.uint8))
ridge = None
for sg in (3.0, 5.0):
    ev = hessian_matrix_eigvals(hessian_matrix(-D, sigma=sg, order='rc', use_gaussian_derivatives=True))
    rr = np.maximum(0, ev[0]) * sg * sg
    ridge = rr if ridge is None else np.maximum(ridge, rr)
ridge[(D < 6) | (owl == 0)] = 0
m = apply_hysteresis_threshold(ridge, LO, HI)
m = remove_small_objects(m, 30)
sk = skeletonize(m).astype(np.uint8)
ys, xs = np.nonzero(sk); pts = set(zip(xs.tolist(), ys.tolist()))
nb = lambda p: [(p[0] + dx, p[1] + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (dx or dy) and (p[0] + dx, p[1] + dy) in pts]
deg = {p: len(nb(p)) for p in pts}; used = set(); paths = []
def walkp(p0, p1):
    path = [p0, p1]; used.add((p0, p1)); used.add((p1, p0))
    while True:
        cur = path[-1]
        if deg[cur] != 2: break
        nx = [q for q in nb(cur) if q != path[-2] and (cur, q) not in used]
        if not nx: break
        q = nx[0]; used.add((cur, q)); used.add((q, cur)); path.append(q)
    return path
for p in sorted(pts):
    if deg[p] != 2:
        for q in nb(p):
            if (p, q) not in used: paths.append(walkp(p, q))
for p in sorted(pts):
    for q in nb(p):
        if (p, q) not in used: paths.append(walkp(p, q))
def rdp(P, eps):
    if len(P) < 3: return list(P)
    A, B = P[0], P[-1]; ab = B - A; L = np.linalg.norm(ab) + 1e-9
    dd = np.abs(ab[0] * (P[1:-1, 1] - A[1]) - ab[1] * (P[1:-1, 0] - A[0])) / L
    i = int(np.argmax(dd)) + 1
    if dd[i - 1] > eps: return rdp(P[:i + 1], eps)[:-1] + rdp(P[i:], eps)
    return [A, B]
Sc = lambda x: 0.65 * x + 0.35 * x * x * (3 - 2 * x)
LUT = np.linspace(0, 1, 4001); SL = Sc(LUT)
inv = lambda post: float(np.interp(np.clip(post / 255.0, 0, 1), SL, LUT))
res = []
for P in paths:
    P = np.array(P, float)
    L = np.sum(np.hypot(*np.diff(P, axis=0).T))
    if L < MINL * SC / 4: continue
    if len(P) > 7:
        k = np.ones(7) / 7; A = P.copy(); A[3:-3, 0] = np.convolve(P[:, 0], k, 'valid'); A[3:-3, 1] = np.convolve(P[:, 1], k, 'valid'); P = A
    Sp = np.array(rdp(P, 0.35 * SC))
    row = []
    for j in range(len(Sp)):
        x, y = Sp[j]
        t = Sp[min(len(Sp) - 1, j + 1)] - Sp[max(0, j - 1)]; t = t / (np.linalg.norm(t) + 1e-9); nrm = np.array([-t[1], t[0]])
        offs = np.arange(-4 * SC, 4 * SC + 0.01, 0.5)
        prof = []
        for o in offs:
            xi, yi = int(round(x + nrm[0] * o)), int(round(y + nrm[1] * o))
            prof.append(max(0.0, float(D[yi, xi])) if 0 <= xi < W and 0 <= yi < H else 0.0)
        prof = np.array(prof); c = len(prof) // 2; pk = prof[c - 4:c + 5].max()
        lo = c
        while lo > 0 and prof[lo - 1] > 0.5 * pk: lo -= 1
        hi = c
        while hi < len(prof) - 1 and prof[hi + 1] > 0.5 * pk: hi += 1
        fw = (hi - lo + 1) * 0.5 / SC
        xi, yi = int(round(x)), int(round(y))
        rv, sv = float(Rb[yi, xi]), float(Rb[yi, xi] - pk)
        kk = inv(sv) / max(1e-3, inv(rv))
        u, v = X0 + (x + 0.5) / SC - 0.5, Y0 + (y + 0.5) / SC - 0.5    # drawing-local pixel-index coordinates
        row.append([round(u, 2), round(v, 2), round(max(0.5, min(3.0, fw)), 2), round(max(0.25, min(1.0, kk)), 3)])
    res.append(row)
json.dump(res, open(a[2], 'w'))
im = cv2.cvtColor(np.clip(S0, 0, 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
for row in res:
    for i in range(1, len(row)):
        p = lambda r: (int((r[0] - X0 + 0.5) * SC - 0.5), int((r[1] - Y0 + 0.5) * SC - 0.5))
        cv2.line(im, p(row[i - 1]), p(row[i]), (0, 0, 255), 1)
cv2.imwrite(a[3], im, [cv2.IMWRITE_JPEG_QUALITY, 90])
print(len(res), 'lines', sum(len(r) for r in res), 'points')
