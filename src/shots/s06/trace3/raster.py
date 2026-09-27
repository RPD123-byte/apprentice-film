#!/usr/bin/env python3
# raster.py: a numpy model of the film's own drawing calls (src/shots/s06/ink.js drawInk / drawMasses and
# src/lib/ink.js taper), used by the r3 fitting loops to predict what a stroke set will look like before it is
# rendered in the browser (measurement helper only; the film never loads this).
# Canvas values are ungraded greys 0..1 (the value the drawing has before src/lib/post.js).
import cv2, numpy as np

SS = 8  # sub-pixel precision of the polygon fill (cv2 shift bits = 3)


def catmull(pts, per):
    """sampleCurve(pts, per) of src/lib/paths.js (open curve)."""
    n = len(pts); out = []
    P = lambda i: pts[max(0, min(n - 1, i))]
    for i in range(n - 1):
        p0, p1, p2, p3 = P(i - 1), P(i), P(i + 1), P(i + 2)
        for j in range(per):
            t = j / per; t2 = t * t; t3 = t2 * t
            out.append(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(pts[n - 1])
    return np.array(out, np.float64)


def taper_poly(q, wv):
    """taper() of src/lib/ink.js: left/right offsets by half width along the chord normal."""
    n = len(q)
    a = q[np.maximum(0, np.arange(n) - 1)]; b = q[np.minimum(n - 1, np.arange(n) + 1)]
    d = b - a; L = np.hypot(d[:, 0], d[:, 1]); L[L == 0] = 1
    dx, dy = d[:, 0] / L, d[:, 1] / L
    hw = wv / 2
    Lp = np.stack([q[:, 0] - dy * hw, q[:, 1] + dx * hw], 1)
    Rp = np.stack([q[:, 0] + dy * hw, q[:, 1] - dx * hw], 1)
    return np.vstack([Lp, Rp[::-1]])


def stroke_geom(s, opts, stride=5):
    """Returns (polygon, tone) of one stroke exactly as drawInk builds it."""
    dv = opts.get('dv', 0); gain = opts.get('gain', 1); wMin = opts.get('wMin', 0.6); end = opts.get('end', 3)
    endMin = opts.get('endMin', 0.35); per = opts.get('per', 3); sharpen = opts.get('sharpen', 1); bright = opts.get('bright', False)
    A = np.asarray(s, np.float64).reshape(-1, stride)
    n = len(A)
    if n < 2: return None, None
    v = A[:, 3]; b = A[:, 4]
    vm = v.max() if bright else v.min()
    vd = np.clip(vm + dv, 0, 1)
    if sharpen != 1:
        bm = b.mean(); vd = np.clip(bm - (bm - vd) * sharpen, 0, 1)
    if bright: wm = A[:, 2] * np.clip((v - b) / np.maximum(0.04, vd - b), 0, 1.5)
    else: wm = A[:, 2] * np.clip((b - v) / np.maximum(0.04, b - vd), 0, 1.5)
    q = catmull(A[:, :2], per)
    S = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(q, axis=0).T))])
    Lt = S[-1]; eL = max(0.5, min(end, Lt * 0.3))
    nq = len(q); i = np.arange(nq); f = i / per
    a_ = np.minimum(n - 1, np.floor(f).astype(int)); b_ = np.minimum(n - 1, a_ + 1); t = f - a_
    w = wm[a_] + (wm[b_] - wm[a_]) * t
    e = np.minimum(1, np.minimum(S / eL, (Lt - S) / eL))
    wv = np.maximum(wMin, w * gain) * (endMin + (1 - endMin) * np.sqrt(np.maximum(0, e)))
    return taper_poly(q, wv), float(np.round(vd * 255) / 255)


KS = 8  # supersampling factor of the coverage model


def _inset(P, d):
    """move every vertex of a closed polygon d px toward its own filled side (cv2 fills a boundary sample
    inclusively, which grows every edge by half a sample; this takes it back)."""
    P = np.asarray(P, np.float64)
    if len(P) < 3 or d == 0: return P
    x, y = P[:, 0], P[:, 1]
    area = 0.5 * np.sum(x * np.roll(y, -1) - np.roll(x, -1) * y)
    nxt = np.roll(P, -1, 0); prv = np.roll(P, 1, 0)
    t = nxt - prv; L = np.hypot(t[:, 0], t[:, 1]); L[L == 0] = 1
    n = np.stack([-t[:, 1], t[:, 0]], 1) / L[:, None]       # left normal of travel
    # for a positive (image-coords clockwise-looking) area the interior lies to the left of travel
    return P + n * d * (1 if area > 0 else -1)


def coverage(polys, shape, off=(0, 0)):
    """Area coverage (0..1) of polygons (even-odd) on a canvas of `shape` whose pixel (0,0) is centred on frame
    point `off` — the way the browser's anti-aliasing fills them once the film draws the data at +0.5 px (pixel i
    covers [i-0.5, i+0.5] in data coordinates). Supersampled KS x KS (cv2's own AA fill is ~0.6 px too fat); each
    polygon is inset by half a sample to undo cv2's inclusive boundary."""
    h, w = shape
    m = np.zeros((h * KS, w * KS), np.uint8)
    d = 0.5 / KS
    pp = [np.round(((_inset(P, d) - np.array(off)) + 0.5) * KS * 8 - 0.5 * 8).astype(np.int32) for P in polys if P is not None and len(P) >= 3]
    if pp: cv2.fillPoly(m, pp, 1, lineType=cv2.LINE_8, shift=3)
    return m.reshape(h, KS, w, KS).mean(axis=(1, 3), dtype=np.float32)


def draw_ink(canvas, strokes, opts=None, off=(0, 0), stride=5, soft=None):
    """drawInk(): composite each stroke in its tone (source-over). With `soft`, the whole set is drawn into a layer and
    composited blurred by `soft` px (canvas blur = gaussian sigma)."""
    opts = opts or {}
    soft = opts.get('soft', 0) if soft is None else soft
    h, w = canvas.shape
    if soft:
        C = np.zeros((h, w), np.float32); A = np.zeros((h, w), np.float32)
    else:
        C = canvas
    for s in strokes:
        P, tone = stroke_geom(s, opts, stride)
        if P is None: continue
        x0 = int(np.floor(P[:, 0].min() - off[0])) - 2; x1 = int(np.ceil(P[:, 0].max() - off[0])) + 3
        y0 = int(np.floor(P[:, 1].min() - off[1])) - 2; y1 = int(np.ceil(P[:, 1].max() - off[1])) + 3
        x0, y0 = max(0, x0), max(0, y0); x1, y1 = min(w, x1), min(h, y1)
        if x1 <= x0 or y1 <= y0: continue
        a = coverage([P], (y1 - y0, x1 - x0), (off[0] + x0, off[1] + y0))
        if soft:
            C[y0:y1, x0:x1] = C[y0:y1, x0:x1] * (1 - a) + tone * a
            A[y0:y1, x0:x1] = A[y0:y1, x0:x1] * (1 - a) + a
        else:
            C[y0:y1, x0:x1] = C[y0:y1, x0:x1] * (1 - a) + tone * a
    if soft:
        Cb = cv2.GaussianBlur(C, (0, 0), soft); Ab = cv2.GaussianBlur(A, (0, 0), soft)
        canvas[:] = canvas * (1 - Ab) + Cb
    return canvas


def draw_masses(canvas, items, blur=0, off=(0, 0), dv=0):
    """drawMasses(): each item [v, ring, ring...] (rings flat x,y lists) filled even-odd in grey v, blurred."""
    h, w = canvas.shape
    for it in items:
        v, rings = it[0], it[1:]
        P = [np.asarray(r, np.float64).reshape(-1, 2) for r in rings]
        a = coverage(P, (h, w), off)
        if blur: a = cv2.GaussianBlur(a, (0, 0), blur)
        tone = float(np.round(np.clip(v + dv, 0, 1) * 255) / 255)
        canvas[:] = canvas * (1 - a) + tone * a
    return canvas


def draw_masses_layer(canvas, items, blur=0, off=(0, 0), base=None, base_mask=None):
    """the r3 way to draw nested outlines: all items drawn crisp (anti-aliased) into one layer (optionally over a
    base fill inside base_mask), and the layer composited blurred as a whole — so outlines that coincide at a sharp
    edge do not compound the way separately blurred fills do."""
    h, w = canvas.shape
    C = np.zeros((h, w), np.float32); A = np.zeros((h, w), np.float32)
    if base is not None:
        a = base_mask.astype(np.float32) if base_mask is not None else np.ones((h, w), np.float32)
        C = C * (1 - a) + base * a; A = A * (1 - a) + a
    for it in items:
        v, rings = it[0], it[1:]
        P = [np.asarray(r, np.float64).reshape(-1, 2) for r in rings]
        a = coverage(P, (h, w), off)
        tone = float(np.round(np.clip(v, 0, 1) * 255) / 255)
        C = C * (1 - a) + tone * a; A = A * (1 - a) + a
    if blur:
        C = cv2.GaussianBlur(C, (0, 0), blur); A = cv2.GaussianBlur(A, (0, 0), blur)
    canvas[:] = canvas * (1 - A) + C
    return canvas
