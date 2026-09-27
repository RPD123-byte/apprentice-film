#!/usr/bin/env python3
# hatch.py: GENERATED hatch families for s06 (measurement only; the film never loads this or any image).
#
# Replaces the traced skeleton strokes of the hatched areas (which crackle: short, branching, random-direction paths)
# with clean hatching that is generated, not traced:
#   - the local stroke direction is MEASURED on the source (structure tensor of the neutral mean, sigma ~6);
#   - the local amount of ink is MEASURED (the darkness under the soft ground: local ground - value, blurred);
#   - evenly spaced streamlines (Jobard-Lefer) are grown along the direction field at a fixed spacing, cut into
#     hand-length pen strokes (seeded lengths and gaps), and given widths so that their ink matches the darkness.
# The streamlines are placed by the generator (not at the source's line positions). Nothing but centre-lines, widths
# and values is written.
#
# Also decides which TRACED strokes of a set are dropped in the hatched areas (shorter than minlen, branching
# (an end touches another stroke's middle), or more than maxdev off the measured direction).
#
# usage: hatch.py [NAME ...]  (configs below; writes src/shots/s06/data/hatch.js with every configured family)
import cv2, numpy as np, json, sys, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
SRC = os.path.join(ROOT, 'snapshots/s06-r2-src')
DATA = os.path.join(HERE, '../data')
DBG = os.path.join(ROOT, 'snapshots/s06-fix1p-hatch'); os.makedirs(DBG, exist_ok=True)

def load_js(name):
    txt = open(os.path.join(DATA, name + '.js')).read()
    txt = re.sub(r'^\s*//.*$', '', txt, flags=re.M)
    out = {}
    parts = re.split(r'export const (\w+)\s*=\s*', txt)
    for i in range(1, len(parts), 2):
        body = parts[i + 1].strip().rstrip(';')
        body = re.sub(r'([{,]\s*)([A-Za-z_]\w*)\s*:', r'\1"\2":', body)
        body = re.sub(r',\s*([\]}])', r'\1', body)
        out[parts[i]] = json.loads(body)
    return out

pre = np.load(os.path.join(SRC, 'neutral_pre.npy')).astype(np.float32)
neu = np.load(os.path.join(SRC, 'neutral.npy')).astype(np.float32)
H, W = pre.shape
g = cv2.GaussianBlur(pre, (0, 0), 0.8)

def ground_of(r=9, blur=4):
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (r, r))
    return cv2.GaussianBlur(cv2.erode(cv2.dilate(g, k), k), (0, 0), blur)

def tensor(sd=1.2, si=6.0):
    gg = cv2.GaussianBlur(pre, (0, 0), sd)
    ix = cv2.Sobel(gg, cv2.CV_32F, 1, 0, ksize=3) / 8; iy = cv2.Sobel(gg, cv2.CV_32F, 0, 1, ksize=3) / 8
    j11 = cv2.GaussianBlur(ix * ix, (0, 0), si); j12 = cv2.GaussianBlur(ix * iy, (0, 0), si); j22 = cv2.GaussianBlur(iy * iy, (0, 0), si)
    phi = 0.5 * np.arctan2(2 * j12, j11 - j22)          # gradient direction
    th = phi + np.pi / 2                                 # line direction
    coh = np.sqrt((j11 - j22) ** 2 + 4 * j12 ** 2) / (j11 + j22 + 1e-9)
    return np.cos(2 * th).astype(np.float32), np.sin(2 * th).astype(np.float32), coh.astype(np.float32)

def poly_mask(polys, grow=0):
    m = np.zeros((H, W), np.uint8)
    for P in polys: cv2.fillPoly(m, [np.array(P, np.int32)], 1)
    if grow > 0: m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1,) * 2))
    return m

def bil(A, x, y):
    x = min(max(x, 0), W - 1.001); y = min(max(y, 0), H - 1.001)
    i, j = int(x), int(y); a, b = x - i, y - j
    return A[j, i] * (1 - a) * (1 - b) + A[j, i + 1] * a * (1 - b) + A[j + 1, i] * (1 - a) * b + A[j + 1, i + 1] * a * b

class Occ:
    def __init__(self, cell): self.c = cell; self.g = {}
    def add(self, x, y, sid):
        self.g.setdefault((int(x // self.c), int(y // self.c)), []).append((x, y, sid))
    def near(self, x, y, r, sid=None, skip_recent=None):
        ci, cj = int(x // self.c), int(y // self.c); n = int(np.ceil(r / self.c))
        r2 = r * r
        for i in range(ci - n, ci + n + 1):
            for j in range(cj - n, cj + n + 1):
                for (px, py, s) in self.g.get((i, j), ()):
                    if s == sid: continue
                    if (px - x) ** 2 + (py - y) ** 2 < r2: return True
        return False

def streamlines(mask, c2, s2, cov, cfg, rs, angoff=0.0):
    """evenly spaced streamlines; the separation follows the tone: dsep = wnom / coverage, within [d, dmax]"""
    d = cfg['d']; dmax = cfg.get('dmax', 3 * d); wnom = cfg.get('wnom', 0); cmin = cfg.get('cmin', 0.04); step = 1.0
    Lmax = cfg.get('Lmax', 160); maxturn = np.radians(cfg.get('maxturn', 25)); dt = cfg.get('dtest', 0.55)
    def dsep(x, y):
        if not wnom: return d
        c = bil(cov, x, y)
        return float(np.clip(wnom / max(c, 1e-3), d, dmax))
    occ = Occ(d); lines = []
    dirfix = cfg.get('dir')   # optional fixed direction (rad) mixed in: [angle, weight]
    def direc(x, y, prev):
        cc, ss = bil(c2, x, y), bil(s2, x, y)
        if dirfix is not None:
            a, wgt = dirfix; cc = cc * (1 - wgt) + np.cos(2 * a) * wgt; ss = ss * (1 - wgt) + np.sin(2 * a) * wgt
        th = 0.5 * np.arctan2(ss, cc) + angoff; v = np.array([np.cos(th), np.sin(th)])
        if prev is not None and v @ prev < 0: v = -v
        return v
    def inside(x, y):
        if x < 1 or y < 1 or x >= W - 2 or y >= H - 2: return False
        return mask[int(y + 0.5), int(x + 0.5)] > 0
    def grow(x0, y0, sid):
        out = []
        for sgn in (1, -1):
            pts = []; x, y = x0, y0; low = 0
            prev = direc(x, y, None) * sgn
            for k in range(int(Lmax)):
                v = direc(x, y, prev)
                xm, ym = x + v[0] * step * 0.5, y + v[1] * step * 0.5
                v2 = direc(xm, ym, v)
                if np.arccos(np.clip(v2 @ prev, -1, 1)) > maxturn: break
                x, y = x + v2[0] * step, y + v2[1] * step; prev = v2
                if not inside(x, y): break
                if occ.near(x, y, dt * dsep(x, y), sid): break
                if bil(cov, x, y) < cmin:
                    low += 1
                    if low > cfg.get('lowrun', 6): break
                else: low = 0
                pts.append((x, y))
            if sgn == 1: out = pts[::-1] + [(x0, y0)]
            else: out = out + pts
        # trim the low-coverage tails
        while out and bil(cov, *out[0]) < cmin: out = out[1:]
        while out and bil(cov, *out[-1]) < cmin: out = out[:-1]
        return out
    ys, xs = np.nonzero(mask[::int(d), ::int(d)])
    cand = [(xs[i] * int(d) + rs.uniform(0, d), ys[i] * int(d) + rs.uniform(0, d)) for i in range(len(xs))]
    cand = [(x, y) for x, y in cand if bil(cov, x, y) >= cmin * 2]
    cand.sort(key=lambda p: -bil(cov, p[0], p[1]))
    queue = []
    ci = 0; sid = 0
    while True:
        if queue: x, y = queue.pop()
        elif ci < len(cand): x, y = cand[ci]; ci += 1
        else: break
        if not inside(x, y) or bil(cov, x, y) < cmin * 1.5 or occ.near(x, y, 0.95 * dsep(x, y)): continue
        L = grow(x, y, sid)
        if len(L) < cfg.get('minpts', 6): continue
        for (px, py) in L: occ.add(px, py, sid)
        lines.append(np.array(L)); sid += 1
        for k in range(0, len(L), 3):
            if k + 1 < len(L): t = np.array(L[k + 1]) - np.array(L[k])
            else: t = np.array(L[k]) - np.array(L[k - 1])
            t /= (np.linalg.norm(t) + 1e-9); nrm = np.array([-t[1], t[0]])
            ds = dsep(*L[k])
            for sg in (1, -1): queue.append((L[k][0] + nrm[0] * ds * sg, L[k][1] + nrm[1] * ds * sg))
    return lines

def smooth_line(L, k):
    if k <= 1 or len(L) < k + 2: return L
    P = np.pad(L, ((k // 2, k // 2), (0, 0)), mode='edge')
    ker = np.ones(k) / k
    S = np.stack([np.convolve(P[:, 0], ker, 'valid'), np.convolve(P[:, 1], ker, 'valid')], 1)
    S[0], S[-1] = L[0], L[-1]
    return S

def cut(lines, cov, ground, cfg, rs):
    """cut streamlines into pen strokes; width from coverage / local line density"""
    d = cfg['d']; v = cfg['v']
    lines = [smooth_line(np.asarray(L), cfg.get('lsmooth', 7)) for L in lines]
    # local line density (lines per px) from the streamlines themselves
    dens = np.zeros((H, W), np.float32)
    for L in lines: cv2.polylines(dens, [np.round(L * 4).astype(np.int32)], False, 1.0, 1, cv2.LINE_AA, 2)
    dens = cv2.GaussianBlur(dens, (0, 0), cfg.get('dsig', 1.6 * d))
    wmax = cfg.get('wmax', 2.2); wmin = cfg.get('wbreak', 0.3)
    lo, hi = cfg.get('seg', [18, 44]); gap = cfg.get('gap', [2, 5])
    out = []
    for L in lines:
        w = np.array([bil(cov, x, y) / max(0.08, bil(dens, x, y)) for x, y in L]) * cfg.get('gain', 1.0)
        w = np.minimum(w, np.minimum(wmax, 0.8 * cfg.get('dmax', 3 * d)))
        w = np.convolve(np.pad(w, 2, mode='edge'), np.ones(5) / 5, 'valid')
        on = w >= wmin
        # runs of on
        i = 0; n = len(L)
        while i < n:
            if not on[i]: i += 1; continue
            j = i
            while j < n and on[j]: j += 1
            # split [i, j) into pen strokes
            k = i
            while k < j:
                ln = int(rs.uniform(lo, hi)); e = min(j, k + ln)
                if j - e < lo * 0.5: e = j
                if e - k >= cfg.get('minseg', 5):
                    seg = []
                    vj = cfg.get('vjit', [0, 0]); vs = float(np.clip(v + rs.uniform(vj[0], vj[1]), 0, 0.9))
                    Pp = cfg.get('paper', 0.95); wf = (Pp - v) / max(0.05, Pp - vs)
                    for q in range(k, e):
                        x, y = L[q]; b = float(bil(ground, x, y))
                        seg.append((x, y, float(w[q]) * wf, vs, max(b, vs + 0.05)))
                    out.append(seg)
                k = e + int(rs.uniform(gap[0], gap[1] + 1))
            i = j
    return out

def rdp(Q, eps):
    if len(Q) < 3: return list(range(len(Q)))
    def rec(a, b):
        if b - a < 2: return [a]
        A, B = Q[a][:2], Q[b][:2]; ab = np.array(B) - np.array(A); Ln = np.linalg.norm(ab) + 1e-9
        best, bi = -1, a
        for i in range(a + 1, b):
            dd = abs(ab[0] * (Q[i][1] - A[1]) - ab[1] * (Q[i][0] - A[0])) / Ln
            if dd > best: best, bi = dd, i
        if best > eps: return rec(a, bi) + rec(bi, b)
        return [a]
    return rec(0, len(Q) - 1) + [len(Q) - 1]

def simplify(seg, eps=0.35):
    idx = rdp(seg, eps)
    # keep width detail: also keep every 4th point
    keep = sorted(set(idx) | set(range(0, len(seg), 4)) | {len(seg) - 1})
    return [seg[i] for i in keep]

def judge_traced(strokes, region, c2, s2, coh, cfg):
    """indices of traced strokes to drop inside region"""
    drop = []
    arr = [np.array(s, float).reshape(-1, 5) for s in strokes]
    # all interior points for the junction test
    from scipy.spatial import cKDTree
    allp, owner, isend = [], [], []
    for si, A in enumerate(arr):
        Q = densify(A[:, :2])
        for k, p in enumerate(Q): allp.append(p); owner.append(si); isend.append(k < 3 or k > len(Q) - 4)
    tree = cKDTree(np.array(allp)); owner = np.array(owner); isend = np.array(isend)
    for si, A in enumerate(arr):
        P = A[:, :2]
        inr = np.mean([region[int(min(H - 1, max(0, y))), int(min(W - 1, max(0, x)))] > 0 for x, y in P])
        if inr < 0.5: continue
        L = float(np.sum(np.hypot(*np.diff(P, axis=0).T))) if len(P) > 1 else 0
        if L < cfg.get('minlen', 25): drop.append(si); continue
        # junction: an end of this stroke lies within 2.5 px of the middle of another stroke
        junc = False
        for e in (P[0], P[-1]):
            for q in tree.query_ball_point(e, cfg.get('jr', 2.5)):
                if owner[q] != si and not isend[q]: junc = True; break
            if junc: break
        if junc: drop.append(si); continue
        # direction: length-weighted mean deviation from the measured direction (where the field is coherent)
        dev, wsum = 0, 0
        for a, b in zip(P[:-1], P[1:]):
            t = b - a; ln = np.linalg.norm(t)
            if ln < 1e-6: continue
            m = (a + b) / 2; th = 0.5 * np.arctan2(bil(s2, *m), bil(c2, *m)); ch = bil(coh, *m)
            ang = abs(((np.arctan2(t[1], t[0]) - th) + np.pi / 2) % np.pi - np.pi / 2)
            dev += ang * ln * ch; wsum += ln * ch
        if wsum > 0 and np.degrees(dev / wsum) > cfg.get('maxdev', 35): drop.append(si)
    return drop

def densify(P, step=1.0):
    out = [P[0]]
    for a, b in zip(P[:-1], P[1:]):
        n = max(1, int(np.linalg.norm(b - a) / step))
        for k in range(1, n + 1): out.append(a + (b - a) * k / n)
    return np.array(out)

def render_dbg(strokes, box, name, base=None):
    x0, y0, x1, y1 = box
    im = np.ones((H, W), np.float32) if base is None else base.copy()
    S = 4
    for s in strokes:
        A = np.array(s, float).reshape(-1, 5)
        for a, b in zip(A[:-1], A[1:]):
            w = max(0.3, (a[2] + b[2]) / 2)
            cv2.line(im, (int(a[0] * S), int(a[1] * S)), (int(b[0] * S), int(b[1] * S)), float(a[3]), max(1, int(round(w))), cv2.LINE_AA, 2)
    return im

FAM = json.load(open(os.path.join(HERE, 'cfg/hatch.json')))

def guide_field(guides, box, c2, s2, wgt, falloff=6.0):
    """direction field from guide polylines (tangent of the nearest guides, 1/(d^2+f^2) weighted, doubled angles),
    mixed into the measured field with weight wgt inside box"""
    x0, y0, x1, y1 = box
    ys, xs = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    C = np.zeros_like(xs); S_ = np.zeros_like(xs); Wt = np.zeros_like(xs)
    for G in guides:
        G = np.array(G, float)
        for a, b in zip(G[:-1], G[1:]):
            t = b - a; L2 = t @ t + 1e-9
            u = np.clip(((xs - a[0]) * t[0] + (ys - a[1]) * t[1]) / L2, 0, 1)
            dx = xs - (a[0] + u * t[0]); dy = ys - (a[1] + u * t[1])
            w = 1.0 / (dx * dx + dy * dy + falloff * falloff) ** 1.5
            th = np.arctan2(t[1], t[0])
            C += w * np.cos(2 * th); S_ += w * np.sin(2 * th); Wt += w
    C /= Wt; S_ /= Wt
    n = np.hypot(C, S_) + 1e-9; C /= n; S_ /= n
    c2 = c2.copy(); s2 = s2.copy()
    cc = c2[y0:y1, x0:x1] * (1 - wgt) + C * wgt; ss = s2[y0:y1, x0:x1] * (1 - wgt) + S_ * wgt
    n = np.hypot(cc, ss) + 1e-9
    c2[y0:y1, x0:x1] = cc / n; s2[y0:y1, x0:x1] = ss / n
    return c2, s2

def run(name, F, c2, s2, coh):
    rs = np.random.RandomState(F.get('seed', 1))
    if F.get('guides'):
        Gd = F['guides']; c2, s2 = guide_field(Gd['lines'], Gd['box'], c2, s2, Gd.get('w', 0.6), Gd.get('falloff', 6))
    ground = ground_of(F.get('bgr', 9), F.get('gblur', 4))
    lit = (cv2.GaussianBlur(neu, (0, 0), 3) > F.get('litthr', 110)).astype(np.uint8)
    region = poly_mask(F['include'], 0) & lit
    if F.get('exclude'):
        for P, grow in F['exclude']: region[poly_mask([P], grow) > 0] = 0
    # traced strokes to drop / keep
    drop = []
    keepmask = np.zeros((H, W), np.uint8)
    if F.get('traced'):
        T = F['traced']; mod = load_js(T['set']); strokes = mod[T.get('key', 'INK')]
        jreg = poly_mask(T['region'], 0)
        drop = judge_traced(strokes, jreg, c2, s2, coh, T)
        for bx in T.get('dropbox', []):   # boxes where every traced stroke goes
            x0, y0, x1, y1 = bx
            for si, s in enumerate(strokes):
                A = np.array(s, float).reshape(-1, 5)
                if np.mean((A[:, 0] >= x0) & (A[:, 0] <= x1) & (A[:, 1] >= y0) & (A[:, 1] <= y1)) > 0.3 and si not in drop: drop.append(si)
        if T.get('droppoly'):
            dm = poly_mask(T['droppoly'], 0)
            for si, s in enumerate(strokes):
                A = np.array(s, float).reshape(-1, 5)
                ins = np.mean([dm[int(min(H - 1, max(0, y))), int(min(W - 1, max(0, x)))] > 0 for x, y in A[:, :2]])
                if ins <= T.get('dropfrac', 0.3) or si in drop: continue
                K = T.get('keepif')   # keep long steep strokes (hair strands falling across the region)
                if K:
                    P = A[:, :2]; Ls = float(np.sum(np.hypot(*np.diff(P, axis=0).T)))
                    t = P[-1] - P[0]; ang = np.degrees(np.arctan2(abs(t[0]), abs(t[1]) + 1e-9))
                    if Ls >= K.get('minlen', 35) and ang < K.get('steep', 40) and float(np.min(A[:, 3])) <= K.get('vmax', 0.35): continue
                drop.append(si)
        for cx, cy, r in T.get('dropnear', []):
            for si, s in enumerate(strokes):
                A = np.array(s, float).reshape(-1, 5)
                if np.min(np.hypot(A[:, 0] - cx, A[:, 1] - cy)) < r and si not in drop: drop.append(si)
        drop = sorted(set(drop))
        # kept strokes (inside the hatch region) are left alone: the hatch keeps clear of them
        for si, s in enumerate(strokes):
            if si in drop: continue
            A = np.array(s, float).reshape(-1, 5)
            for a, b in zip(A[:-1], A[1:]):
                cv2.line(keepmask, (int(a[0]), int(a[1])), (int(b[0]), int(b[1])), 1, max(1, int(round(max(a[2], b[2])))) + 2 * F.get('clear', 2))
        print(name, 'traced', len(strokes), 'drop', len(drop))
    if F.get('clearcontours'):
        CT = json.load(open(os.path.join(DBG, 'contour.json')))
        for cn in F['clearcontours']:
            for st in CT.get(cn, []):
                for a, b in zip(st[:-1], st[1:]):
                    cv2.line(keepmask, (int(round(a[0])), int(round(a[1]))), (int(round(b[0])), int(round(b[1]))), 1, max(1, int(round(0.7 * max(a[2], b[2])))) + 2 * F.get('clear', 2))
    v = F['v']
    if F.get('paper'):
        # all the tone of the region is carried by the hatching up to maxcov; only what is darker than that stays in a
        # (soft) ground
        Pp = F['paper']; mc = F.get('maxcov', 0.85)
        D = np.clip(Pp - g, 0, 1); D[keepmask > 0] = 0
        if F.get('clearpolys'): D[poly_mask(F['clearpolys'], 0) > 0] = 0
        Db = cv2.GaussianBlur(D, (0, 0), F.get('csig', 1.4))
        cov = np.minimum(Db / (Pp - v), mc)
        rest = np.maximum(0, Db - mc * (Pp - v))
        g2 = np.where(region > 0, Pp - cv2.GaussianBlur(rest, (0, 0), 3), ground)
        ground = np.where(region > 0, g2, ground)
    else:
        D = np.clip(ground - g, 0, 1)
        D[keepmask > 0] = 0
        if F.get('clearpolys'): D[poly_mask(F['clearpolys'], 0) > 0] = 0
        cov = cv2.GaussianBlur(D, (0, 0), F.get('csig', 1.4)) / np.maximum(0.1, ground - v)
    cov[region == 0] = 0
    X = F.get('cross')
    if X:   # a second family across the first where the tone is heavier than thr: it takes half of the excess
        ex = np.maximum(0, cov - X['thr'])
        if X.get('poly'): ex = ex * cv2.GaussianBlur(poly_mask([X['poly']], 0).astype(np.float32), (0, 0), 4)
        sh = X.get('share', 0.5)
        cov1 = cov - ex * sh; cov2 = cv2.GaussianBlur(ex * sh, (0, 0), 2)
        lines = streamlines(region, c2, s2, cov1, F, rs)
        segs = cut(lines, cov1, ground, F, rs)
        F2 = dict(F); F2.update(X.get('cfg', {}))
        lines2 = streamlines(region, c2, s2, cov2, F2, rs, np.radians(X['angle']))
        segs += cut(lines2, cov2, ground, F2, rs)
        lines = lines + lines2
    else:
        lines = streamlines(region, c2, s2, cov, F, rs)
        segs = cut(lines, cov, ground, F, rs)
    segs = [simplify(s) for s in segs]
    print(name, 'streamlines', len(lines), 'strokes', len(segs), 'pts', sum(len(s) for s in segs))
    # check: the drawn coverage (4x supersampled polylines with the stroke widths) against the target, in the region
    ys_, xs_ = np.nonzero(region); bx0, by0, bx1, by1 = xs_.min(), ys_.min(), xs_.max() + 1, ys_.max() + 1
    S4 = 4; cvg = np.zeros(((by1 - by0) * S4, (bx1 - bx0) * S4), np.float32)
    for sg_ in segs:
        A = np.array(sg_, float)
        for a, b in zip(A[:-1], A[1:]):
            wv = (a[2] + b[2]) / 2 * S4
            cv2.line(cvg, (int((a[0] - bx0) * S4), int((a[1] - by0) * S4)), (int((b[0] - bx0) * S4), int((b[1] - by0) * S4)), 1.0, max(1, int(round(wv))), cv2.LINE_AA)
    cvg = cv2.resize(cvg, (bx1 - bx0, by1 - by0), interpolation=cv2.INTER_AREA)
    rg = region[by0:by1, bx0:bx1] > 0
    print(name, 'coverage drawn %.3f target %.3f' % (cvg[rg].mean(), cov[by0:by1, bx0:bx1][rg].mean()))
    # debug: the hatch alone over white, the source crop, side by side
    bx = F.get('dbgbox', [0, 0, W, H]); x0, y0, x1, y1 = bx
    S = 4
    big = np.ones(((y1 - y0) * S, (x1 - x0) * S), np.float32)
    for s in segs:
        A = np.array(s, float)
        for a, b in zip(A[:-1], A[1:]):
            w = max(0.25, (a[2] + b[2]) / 2) * S
            cv2.line(big, (int((a[0] - x0) * S), int((a[1] - y0) * S)), (int((b[0] - x0) * S), int((b[1] - y0) * S)), float(v), max(1, int(round(w))), cv2.LINE_AA)
    sm = cv2.resize(big, (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA)
    comp = np.minimum(ground[y0:y1, x0:x1], sm)   # the hatch over the ground (approximate)
    src = pre[y0:y1, x0:x1]
    z = F.get('dbgzoom', 2)
    im = np.hstack([comp, np.ones((y1 - y0, 3)), src])
    cv2.imwrite(os.path.join(DBG, name + '.png'), cv2.resize((np.clip(im, 0, 1) * 255).astype(np.uint8), None, fx=z, fy=z, interpolation=cv2.INTER_CUBIC))
    GROUNDS[name] = (region, ground, lit)
    return segs, drop

GROUNDS = {}
def combined_wash(Wc):
    base = ground_of(Wc.get('bgr', 9), Wc.get('gblur', 4))
    lit = (cv2.GaussianBlur(neu, (0, 0), 3) > Wc.get('litthr', 110)).astype(np.uint8)
    for fn in Wc['families']:
        region, gr, _ = GROUNDS[fn]
        base = np.where(region > 0, gr, base)
    if Wc.get('paperpolys'):   # areas whose tone is all in strokes (ticks, contours): the ground there is paper
        pm = cv2.GaussianBlur(poly_mask(Wc['paperpolys'], 0).astype(np.float32), (0, 0), 3)
        base = base * (1 - pm) + Wc.get('paper', 0.936) * pm
    wreg = poly_mask(Wc['include'], 0) & lit
    for P, grow in Wc.get('exclude', []): wreg[poly_mask([P], grow) > 0] = 0
    return level_rings(base, wreg, Wc)

def level_rings(val, region, Wc):
    items = []
    lv = Wc['levels']
    for i, l in enumerate(lv):
        m = ((val < l) & (region > 0)).astype(np.uint8)
        lo = lv[i + 1] if i + 1 < len(lv) else -1
        band = (m > 0) & (val >= lo)
        v = float(np.median(val[band])) if band.any() else l
        cs, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
        R = []
        for c in cs:
            if abs(cv2.contourArea(c)) < Wc.get('minarea', 60): continue
            c = c[:, 0, :].astype(np.float32); sm = Wc.get('smooth', 2)
            if len(c) > 2 * sm + 2:
                k = 2 * sm + 1; ext = np.vstack([c[-sm:], c, c[:sm]])
                c = np.stack([np.convolve(ext[:, 0], np.ones(k) / k, 'valid'), np.convolve(ext[:, 1], np.ones(k) / k, 'valid')], 1).astype(np.float32)
            a = cv2.approxPolyDP(c.reshape(-1, 1, 2), Wc.get('eps', 1.2), True)[:, 0, :]
            if len(a) >= 3: R.append([round(float(q) * 2) / 2 for pt in a for q in pt])
        if R: items.append([round(v, 3)] + R)
    return items

if __name__ == '__main__':
    c2, s2, coh = tensor(1.2, 6.0)
    outp = os.path.join(DBG, 'hatch.json')
    res = {}
    for n in [k for k in FAM if not k.startswith('_')]:
        segs, drop = run(n, FAM[n], c2, s2, coh)
        res[n] = {'segs': [[[round(p[0], 1), round(p[1], 1), round(p[2], 2), round(p[3], 3), round(p[4], 2)] for p in s] for s in segs], 'drop': drop,
                  'set': FAM[n].get('traced', {}).get('set'), 'key': FAM[n].get('traced', {}).get('key', 'INK')}
    washes = {wn: combined_wash(Wc) for wn, Wc in FAM.get('_wash', {}).items()}
    json.dump(res, open(outp, 'w'))
    # JS module: HATCH[name] = strokes (x y w v b per point), DROP[name] = {set, key, n, idx}
    L = ['// s06 GENERATED hatching (trace/hatch.py): evenly spaced streamlines along the MEASURED stroke direction',
         '// (structure tensor of the source mean), cut into pen strokes whose widths carry the MEASURED darkness under the',
         '// soft ground. The lines are placed by the generator, not traced. x y w v b per point. No pixels are stored.',
         '// DROP: traced strokes of a set that the hatching replaces (short, branching or off-direction), by index.',
         'export const HATCH = {']
    for n, r in res.items():
        L.append(f' {json.dumps(n)}: [')
        for s in r['segs']:
            flat = []
            for p in s: flat += [round(p[0] * 2) / 2, round(p[1] * 2) / 2, round(p[2], 1), round(p[3], 2), round(p[4], 2)]
            L.append('  [' + ','.join('%g' % f for f in flat) + '],')
        L.append(' ],')
    L.append('};')
    L.append('// WASH: the soft ground under the hatching (closing of the measured value, radius bgr), level outlines [v, ring...]')
    L.append('export const WASH = {')
    for n, wv in washes.items():
        L.append(f' {json.dumps(n)}: ' + json.dumps(wv, separators=(',', ':')) + ',')
    L.append('};')
    L.append('export const DROP = {')
    U = {}
    for n, r in res.items():
        if r.get('set'): U.setdefault((r['set'], r['key']), set()).update(r['drop'])
    for (st, key), idx in U.items():
        mod = load_js(st); cnt = len(mod[key])
        L.append(f' {json.dumps(st + "." + key)}: {{ n: {cnt}, idx: {json.dumps(sorted(idx))} }},')
    L.append('};')
    open(os.path.join(DATA, 'hatch.js'), 'w').write('\n'.join(L) + '\n')
    print('wrote data/hatch.js', os.path.getsize(os.path.join(DATA, 'hatch.js')) // 1024, 'KB')
