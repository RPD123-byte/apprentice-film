#!/usr/bin/env python3
# s02 designer ink tracer (measurement script, not loaded by the film).
# Reads a few SOURCE frames of the stare (averaged to cut the grain), estimates the pre-grade paint by inverting the
# global grade (flicker, vignette, S-curve, halation — src/lib/post.js), then measures the ink as centre-lines:
#   dark ridges on the lit ground (face, hoodie, beanie cuff, the lit gaps in the hair)   -> DARK
#   bright ridges inside the black hair masses (the wet partings)                           -> LIGHT
#   dark ridges inside each eye region, from the stare frames and from the look frames     -> EYE0 / EYE1
# Each stroke: per point x, y (frame px) and a draw width (px), plus ONE ink value for the whole stroke; the width is
# the measured ink mass across the stroke (integral of darkness) divided by (local ground - stroke value), so the
# redrawn stroke carries the same ink as the source's. No pixels are written — only control points.
# Usage: trace_designer.py geo.json out.json dbgdir
import cv2, numpy as np, json, sys, os
from skimage.morphology import skeletonize, remove_small_objects
from skimage.filters import apply_hysteresis_threshold
from skimage.feature import hessian_matrix, hessian_matrix_eigvals
from scipy.spatial import cKDTree

V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
geo, out, dbg = sys.argv[1:4]
os.makedirs(dbg, exist_ok=True)
G = json.load(open(geo))
W, H = 2206, 946

cap = cv2.VideoCapture(V)
def mean_frames(fs):
    acc = None
    for f in fs:
        cap.set(cv2.CAP_PROP_POS_FRAMES, f); ok, im = cap.read()
        g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
        acc = g if acc is None else acc + g
    return acc / len(fs)

# ---- invert the grade --------------------------------------------------------------------------------------------
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
qx = ((xx + 0.5) / W - 0.5) * 2; qy = ((yy + 0.5) / H - 0.5) * 2
rr = np.clip((qx * qx + qy * qy) / 2, 0, 1)
VIG = 1 - 0.38 * rr ** 1.15
LUTX = np.linspace(0, 1, 4097); LUTY = LUTX * 0.65 + 0.35 * LUTX * LUTX * (3 - 2 * LUTX)
invS = lambda y: np.interp(np.clip(y, 0, 1), LUTY, LUTX)
def flick(t): return 1 + 0.018 * np.sin(t * 2 * np.pi * 0.9) + 0.012 * np.sin(t * 2 * np.pi * 2.3 + 1.0)
def halo_of(f):
    q = cv2.resize(f, (round(W / 4), round(H / 4)), interpolation=cv2.INTER_AREA)
    hl = np.clip((q - 120 / 255) / (135 / 255), 0, 1) * q
    b5 = cv2.GaussianBlur(hl, (0, 0), 5); b16 = cv2.GaussianBlur(hl, (0, 0), 16)
    hb = 0.6 * b5 + 0.4 * b16
    return cv2.resize(hb, (W, H), interpolation=cv2.INTER_LINEAR)
def paint_of(y, t):
    fh = invS(y / flick(t) / VIG)
    f = fh.copy()
    for _ in range(3):
        hb = halo_of(f)
        f = 1 - (1 - fh) / np.maximum(0.2, 1 - 0.5 * hb)
    return np.clip(f, 0, 1)

# ---- masks ----------------------------------------------------------------------------------------------------------
def poly_mask(pts, grow=0):
    m = np.zeros((H, W), np.uint8)
    cv2.fillPoly(m, [np.round(np.array(pts)).astype(np.int32)], 1)
    if grow > 0: m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1, 2 * grow + 1)))
    if grow < 0: m = cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (-2 * grow + 1, -2 * grow + 1)))
    return m
flat = lambda f: [[f[i], f[i + 1]] for i in range(0, len(f), 2)]
hair_out = np.zeros((H, W), np.uint8); hair_holes = np.zeros((H, W), np.uint8)
for p in G['HAIR']:
    hair_out |= poly_mask(flat(p['o']))
    for h in p['h']: hair_holes |= poly_mask(flat(h))
hair_black = hair_out & (1 - hair_holes)
designer = poly_mask(G['HOODIE']) | poly_mask(G['SKIN']) | poly_mask(G['BEANIE']) | hair_out
designer = cv2.dilate(designer, np.ones((7, 7), np.uint8))
L = G['LAPTOP']; designer[L['y'] - 4:, L['x0'] - 4:L['x1'] + 4] = 0
# the pencil body is drawn (procedural, re-measured); only the teeth biting down on its top are traced over it
pencil = poly_mask([[704, 727], [796, 704], [1312, 704], [1396, 707], [1399, 746], [1312, 749], [796, 750]], 1)
pencil[694:728, 955:1160] = 0
drops = np.zeros((H, W), np.uint8)
for d in G['DROPS']:
    slide = d.get('dy', 0)
    x0 = min(d['top'][0], d['bot'][0]) - 12; x1 = max(d['top'][0], d['bot'][0]) + 14 + abs(d.get('dx', 0))
    y0 = d['top'][1] - 8 - d.get('grow', 0); y1 = d['bot'][1] + slide + 8
    drops[int(y0):int(y1), int(x0):int(x1)] = 1
# eye regions: ellipses round each opening (the lids, the crease above and the double lower lid inside)
EYEREG = [(845, 322, 138, 72), (1234, 318, 138, 72)]
eyes = np.zeros((H, W), np.uint8)
for cx, cy, rx, ry in EYEREG: cv2.ellipse(eyes, (cx, cy), (rx, ry), 0, 0, 360, 1, -1)

# ---- ridge tracing --------------------------------------------------------------------------------------------------
def ridge_map(P, sigmas, bright):
    img = (1 - P if bright else P) * 255
    R = None
    for sg in sigmas:
        Hm = hessian_matrix(img, sigma=sg, order='rc', use_gaussian_derivatives=True)
        ev = hessian_matrix_eigvals(Hm)
        r = np.maximum(0, ev[0]) * sg * sg
        R = r if R is None else np.maximum(R, r)
    return R

def rdp(P, eps):
    if len(P) < 3: return list(P)
    a, b = P[0], P[-1]; ab = b - a; Ln = np.linalg.norm(ab) + 1e-9
    dd = np.abs(ab[0] * (P[1:-1, 1] - a[1]) - ab[1] * (P[1:-1, 0] - a[0])) / Ln
    i = int(np.argmax(dd)) + 1
    if dd[i - 1] > eps: return rdp(P[:i + 1], eps)[:-1] + rdp(P[i:], eps)
    return [a, b]

def trace(P, region, bright, HI, LO, MINL, sigmas=(1.0, 1.8, 2.8), mind=0.03, name='x', split=False):
    if split:
        # fine pass (sigma 1: hatching stays separate lines) + thick pass (sigma 2.2/3.2) only on wide dark runs;
        # the fine pass is kept out of the wide cores so a thick line is not traced twice along its edges
        g = P * 255
        env = cv2.GaussianBlur(cv2.dilate(g, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))), (0, 0), 3)
        dm = ((env - g) > 0.3 * 255).astype(np.uint8)
        dtd = cv2.distanceTransform(dm, cv2.DIST_L2, 3)
        wide = cv2.dilate((dtd >= 2.4).astype(np.uint8), np.ones((5, 5), np.uint8))
        rf = region.copy(); rf[cv2.erode(wide, np.ones((3, 3), np.uint8)) > 0] = 0
        rt = region.copy(); rt[wide == 0] = 0
        a = trace(P, rf, bright, HI, LO, MINL, sigmas=(1.0,), mind=mind, name=name + '-fine')
        b = trace(P, rt, bright, HI, LO, MINL, sigmas=(2.2, 3.2), mind=mind, name=name + '-thick')
        for s in a: s['k'] = 0
        for s in b: s['k'] = 1
        return a + b
    g = P * 255
    if bright:
        env = cv2.erode(g, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))); env = cv2.GaussianBlur(env, (0, 0), 2.5)
        D = g - env
    else:
        env = cv2.dilate(g, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))); env = cv2.GaussianBlur(env, (0, 0), 3)
        D = env - g
    R = ridge_map(P, sigmas, bright)
    R[D < mind * 255] = 0; R[region == 0] = 0
    m = apply_hysteresis_threshold(R, LO, HI)
    m = remove_small_objects(m, 8)
    sk = skeletonize(m).astype(np.uint8)
    dt = cv2.distanceTransform(m.astype(np.uint8), cv2.DIST_L2, 3)
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
    paths = [np.array(Q, float) for Q in paths if len(Q) >= 2]
    # re-join paths whose ends meet and line up
    def endinfo(Q, which):
        if which == 0: p = Q[0]; q = Q[min(len(Q) - 1, 5)]
        else: p = Q[-1]; q = Q[max(0, len(Q) - 6)]
        t = p - q; return p, t / (np.linalg.norm(t) + 1e-9)
    E = []
    for i, Q in enumerate(paths):
        for wh in (0, 1): p, t = endinfo(Q, wh); E.append((i, wh, p, t))
    tree = cKDTree(np.array([e[2] for e in E]))
    cand = []
    for a, b in tree.query_pairs(7.0):
        i, wi, pi, ti = E[a]; j, wj, pj, tj = E[b]
        if i == j: continue
        dv = pj - pi; dist = np.linalg.norm(dv)
        if np.dot(ti, -tj) < 0.8: continue
        if dist > 1.5:
            u = dv / dist
            if np.dot(ti, u) + (-np.dot(tj, u)) < 1.4: continue
        cand.append((dist - 3 * np.dot(ti, -tj), a, b))
    cand.sort(); link = {}
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
            parts.append(paths[i] if wh == 0 else paths[i][::-1])
            other = 2 * i + (1 - wh)
            if other in link: cur = link[other]
            else: break
        chains.append(np.vstack(parts))
    for i, Q in enumerate(paths):
        if i not in seen: chains.append(Q)
    res = []
    for Q in chains:
        Ln = np.sum(np.hypot(*np.diff(Q, axis=0).T)) if len(Q) > 1 else 0
        if Ln < MINL: continue
        if len(Q) > 5:
            k = np.ones(5) / 5; A = Q.copy(); A[2:-2, 0] = np.convolve(Q[:, 0], k, 'valid'); A[2:-2, 1] = np.convolve(Q[:, 1], k, 'valid'); Q = A
        S = np.array(rdp(Q, 0.6))
        # extend each end by a pixel (the skeleton stops short of the tapered tip)
        rows = []
        for k in range(len(S)):
            x, y = S[k]
            t = S[min(len(S) - 1, k + 1)] - S[max(0, k - 1)]; t = t / (np.linalg.norm(t) + 1e-9); nrm = np.array([-t[1], t[0]])
            prof = []; vals = []
            for o in np.arange(-7, 7.01, 0.5):
                px, py = x + nrm[0] * o, y + nrm[1] * o
                xi, yi = int(round(px)), int(round(py))
                if 0 <= xi < W and 0 <= yi < H: prof.append(max(0.0, float(D[yi, xi]))); vals.append(float(g[yi, xi]))
                else: prof.append(0.0); vals.append(0.0)
            prof = np.array(prof); vals = np.array(vals); c = len(prof) // 2
            win = slice(c - 3, c + 4)
            pk = prof[win].max(); ci = c - 3 + int(np.argmax(prof[win]))
            lo = ci
            while lo > 0 and prof[lo - 1] > 0.15 * pk and prof[lo - 1] <= prof[lo] * 1.15: lo -= 1
            hi = ci
            while hi < len(prof) - 1 and prof[hi + 1] > 0.15 * pk and prof[hi + 1] <= prof[hi] * 1.15: hi += 1
            # half-maximum width (x1.06 = the mass of a blurred line at its core depth); integrating the whole
            # profile would sweep in the neighbouring hatch lines
            hl = ci
            while hl > 0 and prof[hl - 1] > 0.5 * pk: hl -= 1
            hh = ci
            while hh < len(prof) - 1 and prof[hh + 1] > 0.5 * pk: hh += 1
            fw = (hh - hl + 1) * 0.5
            I = fw * 1.06 * pk
            core = vals[ci]
            envv = float(env[min(H - 1, max(0, int(round(y)))), min(W - 1, max(0, int(round(x))))])
            rows.append([float(x), float(y), I, core, envv, float(dt[min(H - 1, int(round(y))), min(W - 1, int(round(x)))]), fw])
        rows = np.array(rows)
        # one value per stroke: its darkest (brightest) core; per-point width = mass / contrast to the ground
        if bright:
            v = float(np.percentile(rows[:, 3], 90))
            con = np.maximum(12, v - rows[:, 4])
        else:
            v = float(np.percentile(rows[:, 3], 10))
            con = np.maximum(12, rows[:, 4] - v)
        w = np.clip(rows[:, 2] / con, 0.5, np.minimum(2 * rows[:, 5] + 3.5, 1.3 * np.maximum(1.0, rows[:, 6])))
        res.append({'p': [[round(float(a), 1), round(float(b), 1), round(float(c), 2)] for a, b, c in zip(rows[:, 0], rows[:, 1], w)], 'v': round(v / 255, 3)})
    # debug overlay
    im = cv2.cvtColor((P * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR) // 2
    for s in res:
        q = s['p']
        for i in range(1, len(q)): cv2.line(im, (int(q[i - 1][0]), int(q[i - 1][1])), (int(q[i][0]), int(q[i][1])), (0, 255, 255) if bright else (0, 0, 255), 1)
    cv2.imwrite(f'{dbg}/{name}.png', im)
    print(name, len(res), 'strokes', sum(len(s['p']) for s in res), 'points')
    return res

# ---- dark masses (filled contours with holes): solid ink (brows, lids, the gap under the pencil...) and the dense
# hatched greys, as polygons with their measured mean value; the strokes are drawn over them
def masses(P, region, thr, blur, opn, minarea, name, PCT=50):
    b = cv2.GaussianBlur(P, (0, 0), blur)
    m = ((b < thr) & (region > 0)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (opn, opn)))
    cs, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    res = []
    if hier is None: return res
    hier = hier[0]
    for i, c in enumerate(cs):
        if hier[i][3] != -1: continue
        if cv2.contourArea(c) < minarea: continue
        rings = [cv2.approxPolyDP(c, 0.8, True)[:, 0, :].tolist()]
        j = hier[i][2]
        while j != -1:
            if cv2.contourArea(cs[j]) >= 12: rings.append(cv2.approxPolyDP(cs[j], 0.8, True)[:, 0, :].tolist())
            j = hier[j][0]
        mm = np.zeros_like(m); cv2.drawContours(mm, [cs[k] for k in [i]], -1, 1, -1)
        v = float(np.percentile(P[(mm > 0) & (m > 0)], PCT))
        res.append({'r': rings, 'v': round(v, 3)})
    im = cv2.cvtColor((P * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR) // 2
    for r in res: cv2.polylines(im, [np.array(q, np.int32) for q in r['r']], True, (255, 0, 255), 1)
    cv2.imwrite(f'{dbg}/{name}.png', im)
    print(name, len(res), 'masses', sum(len(q) for r in res for q in r['r']), 'points')
    return res

# ---- run ------------------------------------------------------------------------------------------------------------
A = paint_of(mean_frames(range(206, 217)), 8.44)          # the face, static (sweat settled, eyes masked)
E0 = paint_of(mean_frames(range(152, 173)), 6.5)          # stare eyes (still until 7.00)
E1 = paint_of(mean_frames(range(224, 261)), 9.7)          # look eyes (held 8.96–10.44)
np.save(f'{dbg}/A.npy', A); np.save(f'{dbg}/E0.npy', E0); np.save(f'{dbg}/E1.npy', E1)
HI = float(os.environ.get('HI', 10)); LO = float(os.environ.get('LO', 4.5)); MINL = float(os.environ.get('MINL', 5))
reg_dark = designer.copy(); reg_dark[cv2.erode(hair_black, np.ones((5, 5), np.uint8)) > 0] = 0
reg_dark[pencil > 0] = 0; reg_dark[drops > 0] = 0; reg_dark[eyes > 0] = 0
dark = trace(A, reg_dark, False, HI, LO, MINL, name='dark', split=True)
reg_light = cv2.erode(hair_black, np.ones((3, 3), np.uint8)); reg_light[eyes > 0] = 0; reg_light[drops > 0] = 0
reg_light[poly_mask(G['BEANIE'], 4) > 0] = 0; reg_light[330:430, 0:600] = 0
light = trace(A, reg_light, True, HI, LO, MINL + 3, sigmas=(0.9, 1.6), name='light')
e0 = trace(E0, eyes, False, HI, LO, 4, name='eye0', split=True)
e1 = trace(E1, eyes, False, HI, LO, 4, name='eye1', split=True)
# base values (the ground under the ink): envelope medians per region, for the fills in designer.js
env = cv2.GaussianBlur(cv2.dilate(A, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))), (0, 0), 3)
reg_m = designer.copy(); reg_m[hair_black > 0] = 0; reg_m[eyes > 0] = 0; reg_m[drops > 0] = 0
mgrey = masses(A, reg_m, 0.55, 2.5, 7, 150, 'mass-grey', PCT=75)
mink = masses(A, reg_m, 0.3, 1.0, 3, 25, 'mass-ink')
e0m = masses(E0, eyes, 0.55, 2.5, 7, 100, 'e0-grey', PCT=75) + masses(E0, eyes, 0.3, 1.0, 3, 20, 'e0-ink')
e1m = masses(E1, eyes, 0.55, 2.5, 7, 100, 'e1-grey', PCT=75) + masses(E1, eyes, 0.3, 1.0, 3, 20, 'e1-ink')
json.dump({'dark': dark, 'light': light, 'eye0': e0, 'eye1': e1, 'mgrey': mgrey, 'mink': mink, 'e0m': e0m, 'e1m': e1m}, open(out, 'w'))
np.save(f'{dbg}/env.npy', env)
