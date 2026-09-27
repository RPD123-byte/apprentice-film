#!/usr/bin/env python3
# Outline trace of an engraved plate (measurement script, not loaded by the film).
# Reads a luminance image of the SOURCE (a clean, owl-free median, as .npy uint8 or float 0..1), undoes the film's
# grade (grade.py: the port of src/lib/post.js, inverted incl. halation), then, for each threshold level, traces the
# ink shapes (outer outline + holes; cubic-upsampled 4x, findContours RETR_CCOMP, RDP eps) and gives every shape
# one measured value: flat (mean of what stays visible above the next level, incl. the anti-aliased skirt on level 0)
# or, for big shapes, a linear ramp (plane fit). Only outlines + values are written — no pixels.
# Usage: trace_plate.py in.npy out.js NAME levels eps t [--mask mask.npy] [--bigA 400] [--minarea 1]
import sys, json, numpy as np, cv2, os
sys.path.insert(0, os.path.dirname(__file__))
from grade import inverse

AL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
def enc_int(n, out):
    z = (n << 1) if n >= 0 else ((-n << 1) - 1)
    while True:
        b = z & 31; z >>= 5
        if z: out.append(AL[32 + b])
        else: out.append(AL[b]); break
def enc_ring(r):
    q = np.round(r * 4).astype(np.int64); out = []; px, py = 0, 0
    for x, y in q:
        enc_int(int(x - px), out); enc_int(int(y - py), out); px, py = x, y
    return "".join(out)

def shapes(P, thr, up=4, eps=0.45, minarea=1.0, mask=None):
    Hh, Ww = P.shape
    U = cv2.resize(P, (Ww * up, Hh * up), interpolation=cv2.INTER_CUBIC)
    BU = (U > thr).astype(np.uint8) if thr > -0.5 else np.ones(U.shape, np.uint8)
    if mask is not None: BU &= cv2.resize(mask, (Ww * up, Hh * up), interpolation=cv2.INTER_NEAREST)
    cs, hier = cv2.findContours(BU, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    hier = hier[0] if hier is not None else []
    groups = []
    for i, c in enumerate(cs):
        if hier[i][3] != -1: continue
        rings = [c]; j = hier[i][2]
        while j != -1: rings.append(cs[j]); j = hier[j][0]
        out = []
        for r in rings:
            a = cv2.approxPolyDP(r, eps * up, True).reshape(-1, 2).astype(np.float32)
            if len(a) < 3: continue
            out.append((a + 0.5) / up - 0.5)
        if not out or abs(cv2.contourArea(out[0])) < minarea: continue
        groups.append(out)
    return groups
def cover(g, x0, y0, w, h, ss=4):
    m = np.zeros((h * ss, w * ss), np.uint8)
    cv2.fillPoly(m, [np.round(((r - [x0, y0] + 0.5) * ss - 0.5) * 16).astype(np.int32) for r in g], 255, shift=4)
    return cv2.resize(m, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
def build(P, levels, eps=0.45, bigA=400, mask=None, minarea=1.0):
    Hh, Ww = P.shape
    layers = [shapes(P, l, eps=eps, mask=mask, minarea=minarea) for l in levels]
    res = []
    for k, gs in enumerate(layers):
        nxt = np.zeros((Hh, Ww), np.float32)
        if k + 1 < len(levels):
            allr = [r for g in layers[k + 1] for r in g]
            if allr: nxt = cover(allr, 0, 0, Ww, Hh)
        vals = []
        for g in gs:
            x0, y0 = np.floor(g[0].min(0)).astype(int) - 3; x1, y1 = np.ceil(g[0].max(0)).astype(int) + 4
            x0 = max(x0, 0); y0 = max(y0, 0); x1 = min(x1, Ww); y1 = min(y1, Hh)
            c = cover(g, x0, y0, x1 - x0, y1 - y0)
            vis = c * (1 - nxt[y0:y1, x0:x1]); sub = P[y0:y1, x0:x1]; A = float(vis.sum())
            if A < 0.3: vals.append(None); continue
            extra = 0.0
            if k == 0:
                ring = np.clip(cv2.dilate(c, np.ones((3, 3), np.float32)) - c, 0, 1)
                if mask is not None: ring *= mask[y0:y1, x0:x1]
                extra = float((sub * ring).sum())
            core = float((sub * vis).sum()); mass = core + extra
            if A >= bigA:
                ys, xs = np.nonzero(vis > 0.5); vv = sub[ys, xs] * (mass / max(core, 1e-6))
                M = np.c_[np.ones_like(xs), xs + x0, ys + y0].astype(np.float64)
                co, *_ = np.linalg.lstsq(M, vv, rcond=None)
                a, b, cc = [float(v) for v in co]
                n = np.hypot(b, cc)
                if n * max(x1 - x0, y1 - y0) < 0.03: vals.append(round(min(1, mass / A) * 255)); continue
                # ramp as two points on the gradient line through the shape's bbox + the plane values there
                ux, uy = b / n, cc / n
                corners = np.array([[x0, y0], [x1, y0], [x0, y1], [x1, y1]], np.float64)
                pr = corners @ [ux, uy]; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; pc = cx * ux + cy * uy
                p0 = np.array([cx, cy]) + (pr.min() - pc) * np.array([ux, uy]); p1 = np.array([cx, cy]) + (pr.max() - pc) * np.array([ux, uy])
                v0 = a + b * p0[0] + cc * p0[1]; v1 = a + b * p1[0] + cc * p1[1]
                vals.append([round(p0[0], 1), round(p0[1], 1), round(v0 * 255, 1), round(p1[0], 1), round(p1[1], 1), round(v1 * 255, 1)])
            else: vals.append(round(min(1, mass / A) * 255))
        res.append([(v, g) for v, g in zip(vals, gs) if v is not None])
    return res

if __name__ == "__main__":
    a = sys.argv
    src, out, name = a[1], a[2], a[3]; levels = [float(v) for v in a[4].split(",")]; eps = float(a[5]); t = float(a[6])
    opt = lambda k, d: type(d)(a[a.index(k) + 1]) if k in a else d
    img = np.load(src)
    g = img.astype(np.float32) / 255 if img.dtype == np.uint8 else img.astype(np.float32)
    P = inverse(g, t) if "--nograde" not in a else g
    mask = None
    if "--mask" in a: mask = (np.load(a[a.index("--mask") + 1]) > 0).astype(np.uint8)
    L = build(P, levels, eps=eps, bigA=opt("--bigA", 400), mask=mask, minarea=opt("--minarea", 1.0))
    layers = [[[v, [enc_ring(r) for r in g]] for v, g in lay] for lay in L]
    npts = sum(len(r) for lay in L for _, g in lay for r in g)
    with open(out, "w") as f:
        f.write(f"// Generated by src/shots/s18/trace/trace_plate.py — outline trace (levels {levels}, eps {eps}) of the\n")
        f.write(f"// owl-free source plate: ink shapes as outlines with holes + one measured value (0-255) or ramp per shape.\n")
        f.write(f"// {sum(len(l) for l in L)} shapes, {npts} points. Rings: zigzag varints in base64 (quarter px, delta-coded).\n")
        f.write(f"export const {name} = ")
        json.dump(layers, f, separators=(",", ":"))
        f.write(";\n")
    print("wrote", out, os.path.getsize(out), "bytes;", [len(l) for l in L], "shapes;", npts, "points")
