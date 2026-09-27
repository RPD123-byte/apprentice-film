#!/usr/bin/env python3
# Vector trace of one held owl drawing (s25). Reads ONE source frame, writes control data only:
#   mask  : outline rings of the whole figure (plumage + headphones + held scissors ...)
#   levels: iso-contours of the de-inked value image (pre-grade), with the fill value of each band
#   strokes: centre-lines of thin dark ink lines [x, y, width, value]
# usage: trace_pose.py NAME FRAME rough.json out.json [--dbg dbg.png]
import cv2, numpy as np, json, sys
from skimage import measure
from skimage.morphology import skeletonize, remove_small_objects
from skimage.filters import apply_hysteresis_threshold
from skimage.feature import hessian_matrix, hessian_matrix_eigvals
from scipy import ndimage as ndi
from grade import ungrade
from segm import L

name, F, roughf, outf = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
cfg = json.load(open(roughf))[name]
t = F / 25
S = L(F)[..., ::-1] / 255.0                       # RGB 0..1 (squash undone for frames after 108.08)
P = ungrade(S.astype(np.float32), t)
Pg = P.mean(2).astype(np.float32)
H, W = Pg.shape
K = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
def fill_small(b, maxa):
    holes = (ndi.binary_fill_holes(b) & ~b.astype(bool))
    n_, lab_, st_, _ = cv2.connectedComponentsWithStats(holes.astype(np.uint8))
    out = b.copy()
    for i in range(1, n_):
        if st_[i, 4] <= maxa: out[lab_ == i] = 1
    return out

# ------------------------------------------------------------ the figure mask
# 1. plumage: bright, cracks (thin bright lines) removed by an opening, seeded by the rough body polygon
body = np.zeros((H, W), np.uint8)
if isinstance(cfg['body'], (str, list)) and (isinstance(cfg['body'], str) or isinstance(cfg['body'][0], str)):
    for bn in ([cfg['body']] if isinstance(cfg['body'], str) else cfg['body']):
        PP = json.load(open('poses.json'))[bn]
        for sl in PP['sil']: cv2.fillPoly(body, [np.array(sl, np.int32).reshape(-1, 2)], 1)
    body = cv2.dilate(body, K(cfg.get('bodygrow', 14)))
else:
    cv2.fillPoly(body, [np.array(cfg['body'], np.int32)], 1)
br = (cv2.GaussianBlur(Pg, (0, 0), 1.2) > cfg.get('bright', 0.5)).astype(np.uint8)
br = cv2.morphologyEx(br, cv2.MORPH_OPEN, K(cfg.get('open', 3)))
br &= cv2.dilate(body, K(6))
for cp in cfg.get('cut', []):
    cm = np.zeros((H, W), np.uint8); cv2.fillPoly(cm, [np.array(cp, np.int32)], 1); br[cm > 0] = 0; body[cm > 0] = 0
n, lab, st, _ = cv2.connectedComponentsWithStats(br)
keep = np.zeros_like(br)
for i in range(1, n):
    if st[i, 4] > cfg.get('minarea', 400) and (body[lab == i].mean() > 0.5): keep[lab == i] = 1
plum = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, K(5))
plum = fill_small(plum, cfg.get('maxhole', 1500))
plum = cv2.dilate(plum, K(cfg.get('outline', 3)))          # the dark ink outline round the plumage
plum &= cv2.dilate(body, K(10))
# 2. extras (headphones + band interior, scissors, feet): GrabCut inside each rough polygon
Sb = (S[..., ::-1] * 255).astype(np.uint8)
extra = np.zeros((H, W), np.uint8)
for ex in cfg.get('extras', []):
    poly = np.array(ex['poly'], np.int32)
    if ex.get('mode') == 'bright':
        m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [poly], 1)
        b = (cv2.GaussianBlur(Pg, (0, 0), 1.0) > ex.get('thr', 0.45)).astype(np.uint8) & m
        if ex.get('bg'):
            dd = None
            for bgf in (ex['bg'] if isinstance(ex['bg'], list) else [ex['bg']]):
                Bg = ungrade((L(bgf)[..., ::-1] / 255.0).astype(np.float32), bgf / 25).mean(2)
                d1 = np.abs(cv2.GaussianBlur(Pg, (0, 0), 1.2) - cv2.GaussianBlur(Bg.astype(np.float32), (0, 0), 1.2))
                dd = d1 if dd is None else (np.minimum(dd, d1) if ex.get('bgmode') == 'min' else np.maximum(dd, d1))
            b &= (cv2.dilate((dd > ex.get('dthr', 0.12)).astype(np.uint8), K(1)))
        b = cv2.morphologyEx(b, cv2.MORPH_OPEN, K(ex.get('open', 2)))
        n_, lab_, st_, _ = cv2.connectedComponentsWithStats(b)
        for i in range(1, n_):
            if st_[i, 4] < ex.get('minarea', 300): b[lab_ == i] = 0
        if ex.get('largest'):
            n_, lab_, st_, _ = cv2.connectedComponentsWithStats(b)
            if n_ > 1:
                amax = st_[1:, 4].max(); b = np.isin(lab_, [i for i in range(1, n_) if st_[i, 4] >= ex['largest'] * amax]).astype(np.uint8)
        b = cv2.dilate(b, K(ex.get('outline', 3))) & cv2.dilate(m, K(4))
        b = fill_small(b, ex.get('maxhole', 250))
        extra |= b
        continue
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [poly], 1)
    ring = ex.get('ring', 12)
    x0, y0, bw, bh = cv2.boundingRect(poly); x0 = max(0, x0 - ring - 20); y0 = max(0, y0 - ring - 20); x1 = min(W, x0 + bw + 2 * ring + 40); y1 = min(H, y0 + bh + 2 * ring + 40)
    gc = np.full((H, W), cv2.GC_BGD, np.uint8)
    gc[cv2.dilate(m, K(ring)) > 0] = cv2.GC_PR_BGD
    gc[m > 0] = cv2.GC_PR_FGD
    if ex.get('sure', 0): gc[cv2.erode(m, K(ex['sure'])) > 0] = cv2.GC_FGD
    gc[(plum > 0) & (m > 0)] = cv2.GC_FGD
    sub = np.ascontiguousarray(gc[y0:y1, x0:x1])
    bgd = np.zeros((1, 65), np.float64); fgd = np.zeros((1, 65), np.float64)
    cv2.grabCut(np.ascontiguousarray(Sb[y0:y1, x0:x1]), sub, None, bgd, fgd, 8, cv2.GC_INIT_WITH_MASK)
    fg = ((sub == cv2.GC_FGD) | (sub == cv2.GC_PR_FGD)).astype(np.uint8)
    if ex.get('fill', 1): fg = ndi.binary_fill_holes(fg).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, K(1))
    extra[y0:y1, x0:x1] |= fg
    if ex.get('force'): extra |= m                    # regions taken whole (e.g. the black cap under the band)
mask = (plum | extra).astype(np.uint8)
for hole in cfg.get('holes', []):                     # background seen through loops etc.
    hm = np.zeros((H, W), np.uint8); cv2.fillPoly(hm, [np.array(hole, np.int32)], 1); mask[hm > 0] = 0
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, K(2))
G = cfg.get('grow', 3)
if G: mask = (mask | (cv2.dilate(mask, K(G)) & (cv2.GaussianBlur(Pg, (0, 0), 0.7) < cfg.get('growv', 0.3)).astype(np.uint8))).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(mask)
for i in range(1, n):
    if st[i, 4] < 150: mask[lab == i] = 0
msoft = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 0.8)

def rdp(P, eps):
    P = np.asarray(P)
    if len(P) < 3: return P
    a, b = P[0], P[-1]; ab = b - a; Ln = np.hypot(*ab) + 1e-9
    d = np.abs(ab[0] * (P[1:-1, 1] - a[1]) - ab[1] * (P[1:-1, 0] - a[0])) / Ln
    i = int(np.argmax(d)) + 1
    if d[i - 1] > eps: return np.vstack([rdp(P[:i + 1], eps)[:-1], rdp(P[i:], eps)])
    return np.vstack([a, b])
def rings(img, level, eps, minlen=6, off=(0, 0)):
    out = []
    for c in measure.find_contours(img, level, positive_orientation='high'):
        if len(c) < minlen: continue
        xy = c[:, ::-1] + np.array(off)
        if np.hypot(*(xy[0] - xy[-1])) > 1.5: continue          # open contour (touches the crop edge): skip
        j = int(np.argmax(np.hypot(*(xy - xy[0]).T)))
        r = np.vstack([rdp(xy[:j + 1], eps)[:-1], rdp(xy[j:], eps)])
        if len(r) < 4: continue
        # drop tiny specks
        area = 0.5 * abs(np.dot(r[:, 0], np.roll(r[:, 1], 1)) - np.dot(r[:, 1], np.roll(r[:, 0], 1)))
        if area < cfg.get('minspeck', 10): continue
        out.append([round(float(v), 1) for v in r[:-1].reshape(-1)])
    return out

ys, xs = np.nonzero(mask)
bx0, by0, bx1, by1 = max(0, xs.min() - 4), max(0, ys.min() - 4), min(W, xs.max() + 5), min(H, ys.max() + 5)
crop = lambda a: a[by0:by1, bx0:bx1]
mask_rings = rings(np.pad(crop(msoft), 1), 0.5, 0.5, off=(bx0 - 1, by0 - 1))

# ------------------------------------------------------------ ink strokes (thin dark lines)
Pc0 = cv2.morphologyEx(Pg, cv2.MORPH_CLOSE, K(cfg.get('close', 1)))
D0 = np.maximum(0, Pc0 - Pg)                        # darkness of the thin lines against a de-inked tone
g0 = (Pc0 - Pg) * -255 if cfg.get('ridgeD', 1) else Pg * 255
ridge = None
for sg in cfg.get('sigmas', [0.8, 1.2]):
    Hm = hessian_matrix(g0, sigma=sg, order='rc', use_gaussian_derivatives=True)
    ev = hessian_matrix_eigvals(Hm)
    rr = np.maximum(0, ev[0]) * sg * sg
    ridge = rr if ridge is None else np.maximum(ridge, rr)
ridge[(D0 * 255) < cfg.get('dmin', 6)] = 0
ridge[cv2.erode(mask, K(2)) == 0] = 0
HI, LO = cfg.get('hi', 7), cfg.get('lo', 3.5)
m = apply_hysteresis_threshold(ridge, LO, HI)
m = remove_small_objects(m, max_size=12)
sk = skeletonize(m).astype(np.uint8)
# the tone: the image with the traced ink lines inpainted away (what is not a stroke stays in the tone)
Pc = Pc0
ys, xs = np.nonzero(sk); pts = set(zip(xs.tolist(), ys.tolist()))
nb = lambda p: [(p[0] + dx, p[1] + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (dx or dy) and (p[0] + dx, p[1] + dy) in pts]
deg = {p: len(nb(p)) for p in pts}
used = set(); paths = []
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
paths = [np.array(P_, float) for P_ in paths if len(P_) >= 3]
from scipy.spatial import cKDTree
def endinfo(P_, which):
    if which == 0: p = P_[0]; q = P_[min(len(P_) - 1, 5)]
    else: p = P_[-1]; q = P_[max(0, len(P_) - 6)]
    tv = p - q; return p, tv / (np.linalg.norm(tv) + 1e-9)
E = []
for i, P_ in enumerate(paths):
    for wh in (0, 1): p, tv = endinfo(P_, wh); E.append((i, wh, p, tv))
cand = []
if E:
    tree = cKDTree(np.array([e[2] for e in E]))
    for a, b in tree.query_pairs(7.0):
        i, wi, pi, ti = E[a]; j, wj, pj, tj = E[b]
        if i == j: continue
        dv = pj - pi; dist = np.linalg.norm(dv)
        if np.dot(ti, -tj) < 0.8: continue
        if dist > 1.5:
            u = dv / dist
            if np.dot(ti, u) + (-np.dot(tj, u)) < 1.4: continue
        cand.append((dist - 3 * np.dot(ti, -tj), a, b))
cand.sort()
link = {}
for sc, a, b in cand:
    if a in link or b in link: continue
    link[a] = b; link[b] = a
seen = set(); chains = []
for start in range(len(E)):
    i, wh = E[start][0], E[start][1]
    if i in seen or start in link: continue
    cur = start; parts = []
    while True:
        i, wh = E[cur][0], E[cur][1]
        if i in seen: break
        seen.add(i)
        P_ = paths[i] if wh == 0 else paths[i][::-1]
        parts.append(P_)
        other = 2 * i + (1 - wh)
        if other in link: cur = link[other]
        else: break
    chains.append(np.vstack(parts))
for i, P_ in enumerate(paths):
    if i not in seen: chains.append(P_)
dt = cv2.distanceTransform(m.astype(np.uint8), cv2.DIST_L2, 3)
strokes = []
MINL = cfg.get('minlen', 6)
for P_ in chains:
    Ln = np.sum(np.hypot(*np.diff(P_, axis=0).T))
    if Ln < MINL: continue
    if len(P_) > 5:
        k = np.ones(5) / 5; A = P_.copy(); A[2:-2, 0] = np.convolve(P_[:, 0], k, 'valid'); A[2:-2, 1] = np.convolve(P_[:, 1], k, 'valid'); P_ = A
    Sx = np.array(rdp(P_, 0.5))
    row = []
    for k in range(len(Sx)):
        x, y = Sx[k]
        tv = Sx[min(len(Sx) - 1, k + 1)] - Sx[max(0, k - 1)]; tv = tv / (np.linalg.norm(tv) + 1e-9); nr = np.array([-tv[1], tv[0]])
        prof = []; pv = []
        for o in np.arange(-5, 5.01, 0.5):
            px, py = x + nr[0] * o, y + nr[1] * o
            xi, yi = int(round(px)), int(round(py))
            if 0 <= xi < W and 0 <= yi < H: prof.append(float(D0[yi, xi])); pv.append(float(Pg[yi, xi]))
            else: prof.append(0.0); pv.append(1.0)
        prof = np.array(prof); c = len(prof) // 2
        pk = prof[c - 2:c + 3].max()
        lo = c
        while lo > 0 and prof[lo - 1] > 0.2 * pk: lo -= 1
        hi = c
        while hi < len(prof) - 1 and prof[hi + 1] > 0.2 * pk: hi += 1
        I = prof[lo:hi + 1].sum() * 0.5
        w = min(I / max(pk, 1e-3), 2 * float(dt[int(round(y)), int(round(x))]) + 1.5)
        v = float(min(pv[c - 2:c + 3]))
        row += [round(float(x), 1), round(float(y), 1), round(max(0.5, w), 1), round(max(0, v), 2)]
    strokes.append(row)

# ------------------------------------------------------------ tone (de-inked value image)
Pcb = cv2.GaussianBlur(Pc, (0, 0), cfg.get('tblur', 0.5))
LEVELS = cfg.get('levels', [0.08, 0.14, 0.2, 0.27, 0.34, 0.42, 0.5, 0.58, 0.66, 0.73, 0.79, 0.84, 0.88, 0.915, 0.945])
inside = cv2.erode(mask, K(1)) > 0
V = np.where(mask > 0, Pcb, -1.0).astype(np.float32)
bands = []
edges = [-1.0] + LEVELS + [2.0]
vals = []
for k in range(len(edges) - 1):
    sel = inside & (Pcb >= edges[k]) & (Pcb < edges[k + 1])
    vals.append(float(np.median(Pcb[sel])) if sel.sum() > 20 else (max(0, edges[k]) + min(1, edges[k + 1])) / 2)
levels = []
Vc = np.pad(crop(V), 1, constant_values=-1)
for k, Lv in enumerate(LEVELS):
    rr = rings(Vc, Lv, cfg.get('teps', 0.7), off=(bx0 - 1, by0 - 1))
    levels.append({'l': Lv, 'v': round(vals[k + 1], 3), 'p': rr})
base = round(vals[0], 3)


out = {'frame': F, 't': round(t, 2), 'box': [int(bx0), int(by0), int(bx1), int(by1)], 'mask': mask_rings, 'base': base, 'levels': levels, 'strokes': strokes}
json.dump(out, open(outf, 'w'), separators=(',', ':'))
npts = sum(len(r) // 2 for L_ in levels for r in L_['p'])
print(name, 'mask rings', len(mask_rings), 'level pts', npts, 'strokes', len(strokes), 'stroke pts', sum(len(s) // 4 for s in strokes), 'bytes', len(json.dumps(out, separators=(',', ':'))))
if '--dbg' in sys.argv:
    dbg = sys.argv[sys.argv.index('--dbg') + 1]
    im = (np.dstack([Pg] * 3) * 255).astype(np.uint8)
    cs, _ = cv2.findContours(mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(im, cs, -1, (0, 0, 255), 1)
    for s in strokes:
        q = np.array(s).reshape(-1, 4)
        for i in range(1, len(q)): cv2.line(im, (int(q[i - 1][0]), int(q[i - 1][1])), (int(q[i][0]), int(q[i][1])), (0, 255, 0), 1)
    cv2.imwrite(dbg, im[by0:by1, bx0:bx1])
