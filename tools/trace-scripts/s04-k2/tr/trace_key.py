#!/usr/bin/env python3
# trace_key.py T masks.json out.json [--prev prev.png]
# Measures ONE source frame (time T) of the designer and writes control points only:
#   tone  : a 4-band value study (outlines of the regions darker than each threshold, smoothed image, paint space)
#   dark  : centre-lines of the dark ink strokes (Hessian ridge, hysteresis, skeleton, re-joined), width + value
#   bright: centre-lines of the pale strokes on dark ground (hair partings, knit, rims), width + value
# Values are in PAINT space (the source frame with the film's grade inverted: tr/grade.py), 0..255.
# No pixels are written — only polygons and polylines.
import cv2, numpy as np, json, sys, os
from skimage.morphology import skeletonize, remove_small_objects
from skimage.filters import apply_hysteresis_threshold
from skimage.feature import hessian_matrix, hessian_matrix_eigvals
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
from grade import degrade

T = float(sys.argv[1]); MJ = json.load(open(sys.argv[2])); OUT = sys.argv[3]
key = MJ[f"{T:.2f}"]
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap = cv2.VideoCapture(V); cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(T * 25))); ok, fr = cap.read()
F = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY).astype(np.float32); Hh, Ww = F.shape
P = degrade(F, T)
PAR = dict(sig_t=2.2, levels=[205, 160, 110, 60], eps_t=1.0, min_area=30,
           d_hi=10, d_lo=4.5, b_hi=10, b_lo=4.5, minlen=7, sig_r=1.0)
PAR.update(MJ.get("_par", {})); PAR.update(key.get("par", {}))

def polymask(polys, grow=0):
    if polys and isinstance(polys[0][0], (int, float)): polys = [polys]
    m = np.zeros((Hh, Ww), np.uint8)
    for p in polys: cv2.fillPoly(m, [np.array(p, np.int32)], 1)
    if grow: m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1, 2 * grow + 1)))
    return m
hull = polymask(key["hull"])
if key.get("cut"): hull &= 1 - polymask(key["cut"])
ex = polymask(key.get("exclude", []), 3) if key.get("exclude") else np.zeros_like(hull)
# the region measured: the hull, minus excluded parts (inpainted from their surroundings for the tone study)
Pm = P.copy()
if ex.any():
    Pm = cv2.inpaint(np.clip(P, 0, 255).astype(np.uint8), ex, 9, cv2.INPAINT_TELEA).astype(np.float32)
inner = hull.copy()

# ------------------------------------------------ tone
kk = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (PAR.get("base_k", 7), PAR.get("base_k", 7)))
Base = cv2.morphologyEx(cv2.morphologyEx(Pm, cv2.MORPH_CLOSE, kk), cv2.MORPH_OPEN, kk)
if PAR.get("base_mix", 0): Base = (1 - PAR["base_mix"]) * Base + PAR["base_mix"] * cv2.GaussianBlur(Pm, (0, 0), PAR.get("base_sig", 2.0))
if PAR.get("bilat", 0):
    S = Base.copy()
    for _ in range(PAR["bilat"]): S = cv2.bilateralFilter(S, 0, PAR.get("bil_c", 30), PAR.get("bil_s", 5))
    S = cv2.GaussianBlur(S, (0, 0), PAR["sig_t"])
else:
    S = cv2.GaussianBlur(Base, (0, 0), PAR["sig_t"])
Bs = S.copy()            # the crisp base the ink marks are measured against
if PAR.get("classes"):
    # value classes (cleaned of small islands), each smoothed at a large scale inside itself (normalised
    # convolution): the drawn tone is smooth; everything finer comes back as ink marks (the residual, below)
    cl = np.digitize(cv2.GaussianBlur(Bs, (0, 0), PAR.get("class_pre", 2.0)), PAR["classes"]).astype(np.uint8)
    for _ in range(2): cl = cv2.medianBlur(cl, PAR.get("class_med", 9))
    sm = np.zeros_like(S)
    sg = PAR.get("class_sig", 10)
    for c in range(len(PAR["classes"]) + 1):
        m = ((cl == c) & (inner > 0)).astype(np.float32)
        if m.sum() < 10: continue
        num = cv2.GaussianBlur(Bs * m, (0, 0), sg); den = cv2.GaussianBlur(m, (0, 0), sg)
        sm = np.where(m > 0, num / np.maximum(den, 1e-4), sm)
    S = sm
L = PAR["levels"]
bands = []
edges = [256] + L + [-1]
vals = []
for k in range(len(edges) - 1):
    m = (S < edges[k]) & (S >= edges[k + 1]) & (inner > 0)
    vals.append(float(np.median(S[m])) if m.sum() > 50 else (edges[k] + max(0, edges[k + 1])) / 2)
def rings(mask, eps, mina):
    cs, hier = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cs:
        if abs(cv2.contourArea(c)) < mina: continue
        a = cv2.approxPolyDP(c, eps, True)[:, 0, :]
        if len(a) < 3: continue
        out.append([[int(p[0]), int(p[1])] for p in a])
    return out
tone = [{"v": round(vals[0], 1), "rings": rings(inner > 0, 1.5, 100)}]
for k, th in enumerate(L):
    m = (S < th) & (inner > 0)
    tone.append({"v": round(vals[k + 1], 1), "th": th, "rings": rings(m, PAR["eps_t"], PAR["min_area"])})

# ------------------------------------------------ strokes
def ridges(img, sign, sig_list):
    R = None
    for sg in sig_list:
        Hm = hessian_matrix(img, sigma=sg, order='rc', use_gaussian_derivatives=True)
        ev = hessian_matrix_eigvals(Hm)
        rr = (np.maximum(0, ev[0]) if sign > 0 else np.maximum(0, -ev[1])) * sg * sg
        R = rr if R is None else np.maximum(R, rr)
    return R
g = cv2.GaussianBlur(P, (0, 0), 0.8)
bgL = cv2.GaussianBlur(cv2.dilate(g, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))), (0, 0), 3)   # local light
bgD = cv2.GaussianBlur(cv2.erode(g, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))), (0, 0), 3)    # local dark
use = (inner > 0) & (ex == 0)
use = cv2.erode(use.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0

# where the source is densely hatched (high line energy at hatch scale), fainter ridges count as lines too
_bp = cv2.GaussianBlur(P, (0, 0), 1.0) - cv2.GaussianBlur(P, (0, 0), 3.0)
HATCH = np.clip((cv2.GaussianBlur(np.abs(_bp), (0, 0), 12) - PAR.get("h0", 6)) / PAR.get("h1", 6), 0, 1)
def trace(sign):
    if sign > 0:
        R = ridges(P, +1, [PAR["sig_r"], 2.0]); D = (bgL - g); loc = cv2.GaussianBlur(Base, (0, 0), 2.0)
        R[(D < 8) | (~use) | (bgL < PAR.get("dark_min_bg", 70)) | (loc < PAR.get("dark_min_loc", 60))] = 0
        hi, lo = PAR["d_hi"], PAR["d_lo"]
    else:
        R = ridges(P, -1, [PAR["sig_r"], 1.8]); D = (g - bgD); loc = cv2.GaussianBlur(Base, (0, 0), 2.0)
        R[(D < 8) | (~use) | (bgD > PAR.get("bright_max_bg", 45)) | (loc > PAR.get("bright_max_loc", 90))] = 0
        hi, lo = PAR["b_hi"], PAR["b_lo"]
    R = R * (1 + PAR.get("hboost", 0) * HATCH)
    m = apply_hysteresis_threshold(R, lo, hi)
    m = remove_small_objects(m, 12)
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
    paths = [np.array(Pp, float) for Pp in paths if len(Pp) >= 3]
    if not paths: return []
    def endinfo(Pp, which):
        if which == 0: p = Pp[0]; q = Pp[min(len(Pp) - 1, 5)]
        else: p = Pp[-1]; q = Pp[max(0, len(Pp) - 6)]
        t = p - q; return p, t / (np.linalg.norm(t) + 1e-9)
    E = []
    for i, Pp in enumerate(paths):
        for wh in (0, 1): p, t = endinfo(Pp, wh); E.append((i, wh, p, t))
    tree = cKDTree(np.array([e[2] for e in E]))
    cand = []
    for a, b in tree.query_pairs(9.0):
        i, wi, pi, ti = E[a]; j, wj, pj, tj = E[b]
        if i == j: continue
        dv = pj - pi; dist = np.linalg.norm(dv)
        if np.dot(ti, -tj) < 0.75: continue
        if dist > 1.5:
            u = dv / dist
            if np.dot(ti, u) + (-np.dot(tj, u)) < 1.3: continue
        cand.append((dist - 3 * np.dot(ti, -tj), a, b))
    cand.sort(); link = {}
    for sc, a, b in cand:
        if a in link or b in link: continue
        link[a] = b; link[b] = a
    seen = set(); chains = []
    for start in range(len(E)):
        i, wh = E[start][0], E[start][1]
        if i in seen or start in link: continue
        cur_e = start; parts = []
        while True:
            i, wh = E[cur_e][0], E[cur_e][1]
            if i in seen: break
            seen.add(i)
            parts.append(paths[i] if wh == 0 else paths[i][::-1])
            other = 2 * i + (1 - wh)
            if other in link: cur_e = link[other]
            else: break
        chains.append(np.vstack(parts))
    for i, Pp in enumerate(paths):
        if i not in seen: chains.append(Pp)
    def rdp(Pp, eps):
        if len(Pp) < 3: return list(Pp)
        a, b = Pp[0], Pp[-1]; ab = b - a; Lb = np.linalg.norm(ab) + 1e-9
        dd = np.abs(ab[0] * (Pp[1:-1, 1] - a[1]) - ab[1] * (Pp[1:-1, 0] - a[0])) / Lb
        i = int(np.argmax(dd)) + 1
        if dd[i - 1] > eps: return rdp(Pp[:i + 1], eps)[:-1] + rdp(Pp[i:], eps)
        return [a, b]
    D0 = (bgL - P) if sign > 0 else (P - bgD)
    Pg = cv2.GaussianBlur(P, (0, 0), 0.7)
    res = []
    for Pp in chains:
        Ln = np.sum(np.hypot(*np.diff(Pp, axis=0).T))
        if Ln < PAR["minlen"]: continue
        if len(Pp) > 7:
            k = np.ones(5) / 5; A = Pp.copy(); A[2:-2, 0] = np.convolve(Pp[:, 0], k, 'valid'); A[2:-2, 1] = np.convolve(Pp[:, 1], k, 'valid'); Pp = A
        Sx = np.array(rdp(Pp, 0.6))
        row = []
        for k in range(len(Sx)):
            x, y = Sx[k]
            t = Sx[min(len(Sx) - 1, k + 1)] - Sx[max(0, k - 1)]; t = t / (np.linalg.norm(t) + 1e-9); nrm = np.array([-t[1], t[0]])
            prof = []
            for o in np.arange(-6, 6.01, 0.5):
                xi, yi = int(round(x + nrm[0] * o)), int(round(y + nrm[1] * o))
                prof.append(max(0.0, float(D0[yi, xi])) if 0 <= xi < Ww and 0 <= yi < Hh else 0.0)
            prof = np.array(prof); c = len(prof) // 2
            pk = prof[c - 2:c + 3].max()
            lo_ = c
            while lo_ > 0 and prof[lo_ - 1] > 0.5 * pk: lo_ -= 1
            hi_ = c
            while hi_ < len(prof) - 1 and prof[hi_ + 1] > 0.5 * pk: hi_ += 1
            xi, yi = int(round(x)), int(round(y))
            w = min((hi_ - lo_ + 1) * 0.5, 2 * float(dt[yi, xi]) + 1.5)
            base = float(bgL[yi, xi]) if sign > 0 else float(bgD[yi, xi])
            v = base - pk if sign > 0 else base + pk      # the stroke's own paint value (0..255)
            # two-sided test: a line has ground on BOTH sides (an edge of a mass has it on one side only)
            o = max(0.6, w) / 2 + PAR.get("side_off", 2.5)
            def smp(px, py):
                xi2, yi2 = int(round(px)), int(round(py))
                return float(Pg[yi2, xi2]) if 0 <= xi2 < Ww and 0 <= yi2 < Hh else 0.0
            a1 = smp(x + nrm[0] * o, y + nrm[1] * o); a2 = smp(x - nrm[0] * o, y - nrm[1] * o); c0 = smp(x, y)
            con = (min(a1, a2) - c0) if sign > 0 else (c0 - max(a1, a2))
            row.append([round(float(x), 1), round(float(y), 1), round(max(0.6, w), 1), round(float(np.clip(v, 0, 255)), 0), round(base, 0), con])
        # split at points failing the two-sided test
        run = []
        def flush(run):
            if len(run) >= 2 and np.sum(np.hypot(*np.diff(np.array([q[:2] for q in run]), axis=0).T)) >= PAR["minlen"]:
                res.append([q[:5] for q in run])
        for q in row:
            if q[5] >= PAR.get("side_min", 10): run.append(q)
            else: flush(run); run = []
        flush(run)
    return res

dark = trace(+1) if PAR.get("strokes", 1) else []
bright = trace(-1) if PAR.get("strokes", 1) else []
# ------------------------------------------------ ink marks as crisp outlines: darker / paler than the local base
Pf = cv2.GaussianBlur(Pm, (0, 0), PAR.get("ink_sig", 0.8))
inkd, inkb = [], []
def ink_rings(m, src):
    """outlines of the marks in mask m, grouped by their own mean value (quantised to 8 levels of paint)"""
    cs, hier = cv2.findContours(m.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    groups = {}
    if hier is None: return []
    hier = hier[0]
    lab = np.zeros(m.shape, np.int32)
    for i, c in enumerate(cs):
        if hier[i][3] >= 0: continue            # holes are handled with their parent
        if abs(cv2.contourArea(c)) < PAR.get("ink_min", 4): continue
        x, y, w, h = cv2.boundingRect(c)
        sub = np.zeros((h + 2, w + 2), np.uint8)
        ring_list = [c]
        ch = hier[i][2]
        while ch >= 0: ring_list.append(cs[ch]); ch = hier[ch][0]
        cv2.drawContours(sub, [r - [x - 1, y - 1] for r in ring_list], -1, 1, -1)
        vals_ = src[y - 1:y + h + 1, x - 1:x + w + 1]
        if vals_.shape != sub.shape: continue
        mv = float((vals_ * sub).sum() / max(1, sub.sum()))
        q = int(round(mv / 8) * 8)
        out = []
        for r in ring_list:
            a = cv2.approxPolyDP(r, PAR.get("eps_ink", 0.6), True)[:, 0, :]
            if len(a) >= 3: out.append([[int(p[0]), int(p[1])] for p in a])
        groups.setdefault(q, []).extend(out)
    return [{"v": q, "rings": rr} for q, rr in sorted(groups.items(), reverse=True)]
if PAR.get("ink", 1):
    Sd = cv2.GaussianBlur(S, (0, 0), 1.2)   # the tone as drawn (fills blurred)
    # nested levels of the residual (darker / paler than the drawn tone by more than each step), each mark filled
    # with its own mean: dense hatching keeps its line cores instead of averaging into a grey smudge
    inkd, inkb = [], []
    for lv in PAR.get("ink_dl", [PAR.get("ink_dd", 25)]):
        md = ((Sd - Pf) > lv) & (inner > 0)
        inkd += ink_rings(md, Pf)
    for lv in PAR.get("ink_bl", [PAR.get("ink_bd", 25)]):
        mb = ((Pf - Sd) > lv) & (inner > 0)
        inkb += sorted(ink_rings(mb, Pf), key=lambda b: b["v"])
if PAR.get("solid", 0):
    # solid inks (the inker's filled blacks and the white-ink highlights): one mask each, much darker / paler than
    # the value study and near black / white; each set filled with one measured value
    Sd = cv2.GaussianBlur(S, (0, 0), 1.2)
    def solid(m, fallback):
        m = m.astype(np.uint8)
        cs, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
        rr = []
        for c in cs:
            if abs(cv2.contourArea(c)) < PAR.get("sol_min", 6): continue
            a = cv2.approxPolyDP(c, PAR.get("sol_eps", 0.8), True)[:, 0, :]
            if len(a) >= 3: rr.append([[int(p[0]), int(p[1])] for p in a])
        v = float(np.median(Pf[m > 0])) if m.sum() > 20 else fallback
        return [{"v": round(v, 1), "rings": rr}] if rr else []
    Pk = cv2.GaussianBlur(P, (0, 0), PAR.get("sol_sig", 0.7))
    inkd = solid((((Sd - Pf) > PAR.get("sol_dd", 50)) & (Pf < PAR.get("sol_dv", 60)) | (Pk < PAR.get("sol_abs", 38))) & (inner > 0), 10)
    inkb = solid(((Pf - Sd) > PAR.get("sol_bd", 50)) & (Pf > PAR.get("sol_bv", 180)) & (inner > 0), 240)
# knife directions for the engraved room (full-frame keys): the local line direction of the source's texture
# (structure tensor of the gradients at sigma 10, the direction of least change), on a 24 px grid, in 1/90 of pi
dirs = None
if key.get("full"):
    # knife directions and where to cut: the line direction of the source's fine texture (structure tensor of the
    # high-passed frame, sigma 16) and a weight = texture energy x coherence, on a 24 px grid
    # the texture the tone + marks miss: render them (as the JS does) and look at the residual's line energy
    import preview as PV
    PV.SS = 1
    Kd = {"tone": tone, "dark": [], "bright": [], "inkd": inkd, "inkb": inkb, "hull": key["hull"]}
    Rimg, _ = PV.render(Kd, {"tblur": 1.2})
    Rs = P - Rimg
    hp = Rs - cv2.GaussianBlur(Rs, (0, 0), 4)
    gx_ = cv2.Sobel(cv2.GaussianBlur(hp, (0, 0), 1.0), cv2.CV_32F, 1, 0); gy_ = cv2.Sobel(cv2.GaussianBlur(hp, (0, 0), 1.0), cv2.CV_32F, 0, 1)
    sg_ = PAR.get("dir_sig", 16)
    jxx = cv2.GaussianBlur(gx_ * gx_, (0, 0), sg_); jyy = cv2.GaussianBlur(gy_ * gy_, (0, 0), sg_); jxy = cv2.GaussianBlur(gx_ * gy_, (0, 0), sg_)
    ang = 0.5 * np.arctan2(2 * jxy, jxx - jyy) + np.pi / 2        # along the lines
    coh = np.sqrt((jxx - jyy) ** 2 + 4 * jxy ** 2) / (jxx + jyy + 1e-3)
    bp0 = cv2.GaussianBlur(P, (0, 0), 1.0) - cv2.GaussianBlur(P, (0, 0), 3.0)
    eb0 = cv2.GaussianBlur(np.abs(bp0), (0, 0), 12)                         # the source's hatch-scale line energy
    bp = cv2.GaussianBlur(Rs, (0, 0), 1.0) - cv2.GaussianBlur(Rs, (0, 0), 3.0)
    eb = cv2.GaussianBlur(np.abs(bp), (0, 0), 12)                          # ... of what the drawing misses
    lm = cv2.GaussianBlur(P, (0, 0), 12)
    midt = np.clip((lm - 30) / 30, 0, 1) * np.clip((225 - lm) / 30, 0, 1)
    wt = np.clip((eb - PAR.get("en0", 3.5)) / PAR.get("en1", 4), 0, 1) * np.clip((coh - PAR.get("coh0", 0.3)) / 0.3, 0, 1) * midt
    wt[inner == 0] = 0
    soft = np.clip((PAR.get("soft0", 4.0) - eb0) / 2.5, 0, 1)             # where the source itself is soft (motion blur)
    step = 24; nx, ny = Ww // step + 2, Hh // step + 2
    xs = np.minimum(np.arange(nx) * step, Ww - 1); ys = np.minimum(np.arange(ny) * step, Hh - 1)
    a = np.mod(ang[ys][:, xs], np.pi)
    dirs = {"nx": nx, "ny": ny, "step": step, "v": np.round(a / np.pi * 90).astype(int).clip(0, 90).ravel().tolist(),
            "w": np.round(wt[ys][:, xs] * 90).astype(int).clip(0, 90).ravel().tolist(),
            "s": np.round(soft[ys][:, xs] * 90).astype(int).clip(0, 90).ravel().tolist()}
json.dump({"t": T, "full": key.get("full", 0), "dirs": dirs, "fig": key.get("hull_fig"), "hull": key["hull"], "cut": key.get("cut", []), "tone": tone, "dark": dark, "bright": bright, "inkd": inkd, "inkb": inkb,
           "par": PAR}, open(OUT, "w"))
print("ink", [(b["v"], len(b["rings"]), sum(len(r) for r in b["rings"])) for b in inkd + inkb])
print(f"{T:.2f}: tone {[len(b['rings']) for b in tone]} pts {sum(len(r) for b in tone for r in b['rings'])}, dark {len(dark)} ({sum(len(r) for r in dark)} pts), bright {len(bright)} ({sum(len(r) for r in bright)} pts), vals {[round(v) for v in vals]}")
