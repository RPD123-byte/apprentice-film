#!/usr/bin/env python3
# lineframe.py: coordinates relative to a fitted mouth line (measurement helper only). A point is (u, d): u = arc
# length along the line's sampled curve (px from its left end, as a fraction of the length), d = distance along the
# line's upward normal (the same normal face2.js drawMouthLine uses for its upper edge). The film re-attaches the lip
# comb to each frame's own line this way (face2.js drawComb).
import numpy as np, cv2
from raster import catmull


def geom(s):
    A = np.asarray(s, np.float64).reshape(-1, 5)
    q = catmull(A[:, :2], 3)
    S = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(q, axis=0).T))])
    i = np.arange(len(q)); t = q[np.minimum(len(q) - 1, i + 1)] - q[np.maximum(0, i - 1)]
    l = np.hypot(t[:, 0], t[:, 1]); l[l == 0] = 1
    up = np.stack([t[:, 1] / l, -t[:, 0] / l], 1)
    return q, S, up


def to_ud(s, P):
    """frame points P (N,2) -> (u in 0..1, d px) relative to line s (nearest point on the sampled curve)."""
    q, S, up = geom(s)
    P = np.asarray(P, np.float64)
    seg_a, seg_b = q[:-1], q[1:]
    ab = seg_b - seg_a; L2 = np.maximum(1e-9, (ab ** 2).sum(1))
    out = []
    for p in P:
        t = np.clip(((p - seg_a) * ab).sum(1) / L2, 0, 1)
        c = seg_a + ab * t[:, None]; d2 = ((p - c) ** 2).sum(1); k = int(np.argmin(d2))
        s_ = S[k] + t[k] * np.sqrt(L2[k])
        n = up[k] * (1 - t[k]) + up[min(len(up) - 1, k + 1)] * t[k]; n /= np.linalg.norm(n) + 1e-9
        out.append([s_ / S[-1], float(np.dot(p - c[k], n))])
    return np.array(out)


def from_ud(s, UD):
    q, S, up = geom(s)
    u = np.clip(np.asarray(UD)[:, 0], 0, 1) * S[-1]
    x = np.interp(u, S, q[:, 0]); y = np.interp(u, S, q[:, 1])
    nx = np.interp(u, S, up[:, 0]); ny = np.interp(u, S, up[:, 1]); nl = np.hypot(nx, ny); nl[nl == 0] = 1
    d = np.asarray(UD)[:, 1]
    return np.stack([x + nx / nl * d, y + ny / nl * d], 1)


def band_mask(s, shape, d0, d1, u0=0.0, u1=1.0, step=0.5):
    """pixels whose (u, d) lies in [u0,u1] x [d0,d1] (rasterised by sweeping the normal)."""
    q, S, up = geom(s)
    m = np.zeros(shape, np.uint8)
    us = np.arange(u0 * S[-1], u1 * S[-1], 0.7)
    for dd in np.arange(d0, d1 + 1e-6, step):
        x = np.interp(us, S, q[:, 0]) + np.interp(us, S, up[:, 0]) * dd
        y = np.interp(us, S, q[:, 1]) + np.interp(us, S, up[:, 1]) * dd
        xi = np.round(x).astype(int); yi = np.round(y).astype(int)
        ok = (xi >= 0) & (yi >= 0) & (xi < shape[1]) & (yi < shape[0])
        m[yi[ok], xi[ok]] = 1
    return cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)) > 0
