#!/usr/bin/env python3
# Shard network from measured edge segments (coordinates only): each segment is extended along its own direction until
# it meets another line (<= ext px), the lines are rasterised at full resolution, and the cells between them are
# traced as straight-edged polygons (approxPolyDP; convex hull when the cell is nearly convex).
import cv2, numpy as np

def seg_hit(p, d, segs, maxt, skip):
    """first intersection of ray p + t d (0 < t <= maxt) with segments segs[k] = (x0, y0, x1, y1); returns t or None"""
    best = None
    for k, (x0, y0, x1, y1) in enumerate(segs):
        if k == skip: continue
        e = np.array([x1 - x0, y1 - y0]); den = d[0] * e[1] - d[1] * e[0]
        if abs(den) < 1e-9: continue
        w = np.array([x0 - p[0], y0 - p[1]])
        t = (w[0] * e[1] - w[1] * e[0]) / den; u = (w[0] * d[1] - w[1] * d[0]) / den
        if 0.5 < t <= maxt and -0.02 <= u <= 1.02 and (best is None or t < best): best = t
    return best

def extend(segs, ext_px=90, ext_frac=1.2, bounds=None):
    segs = [tuple(map(float, s)) for s in segs]
    order = sorted(range(len(segs)), key=lambda k: -np.hypot(segs[k][2] - segs[k][0], segs[k][3] - segs[k][1]))
    out = list(segs)
    for k in order:
        x0, y0, x1, y1 = out[k]; L = np.hypot(x1 - x0, y1 - y0)
        if L < 1: continue
        d = np.array([x1 - x0, y1 - y0]) / L; mx = min(ext_px, ext_frac * L)
        t1 = seg_hit(np.array([x1, y1]), d, out, mx, k)
        t0 = seg_hit(np.array([x0, y0]), -d, out, mx, k)
        if t1 is not None: x1, y1 = x1 + d[0] * (t1 + 1.5), y1 + d[1] * (t1 + 1.5)
        if t0 is not None: x0, y0 = x0 - d[0] * (t0 + 1.5), y0 - d[1] * (t0 + 1.5)
        out[k] = (x0, y0, x1, y1)
    return out

def cells(segs, W, H, pad=0, width=2, min_area=250, eps=2.5, hull_ratio=0.9):
    """components between the rasterised lines -> [(poly Nx2 float, area, component mask id)], label image"""
    Wp, Hp = W + 2 * pad, H + 2 * pad
    m = np.zeros((Hp, Wp), np.uint8)
    for (x0, y0, x1, y1) in segs:
        cv2.line(m, (int(round(x0 + pad)), int(round(y0 + pad))), (int(round(x1 + pad)), int(round(y1 + pad))), 255, width)
    n, lab, st, _ = cv2.connectedComponentsWithStats((m == 0).astype(np.uint8), connectivity=4)
    res = []
    for i in range(1, n):
        if st[i, 4] < min_area: continue
        x, y, w, h = st[i, :4]
        sub = (lab[y:y + h, x:x + w] == i).astype(np.uint8)
        # grow by the line half-width so neighbouring cells meet under the stroke
        sub = cv2.dilate(np.pad(sub, 3), np.ones((3, 3), np.uint8), iterations=width)
        cs, _ = cv2.findContours(sub, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        c = max(cs, key=cv2.contourArea)
        a = cv2.contourArea(c)
        hull = cv2.convexHull(c)
        P = hull if a / max(1.0, cv2.contourArea(hull)) >= hull_ratio else c
        P = cv2.approxPolyDP(P, eps, True).reshape(-1, 2).astype(np.float64)
        P += [x - 3 - pad, y - 3 - pad]
        res.append((P, a, i))
    return res, lab, pad
