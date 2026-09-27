#!/usr/bin/env python3
# fit.py: analysis-by-synthesis calibration of traced strokes (measurement helper only; the film never loads this).
# The strokes are rendered with raster.py (a numpy model of the film's drawInk), compared with the ungraded source
# (both blurred a little), and each POINT's width and each STROKE's tone are nudged until the ink matches; the soft
# ground under the strokes is corrected from the low-frequency remainder. Only the numbers change: positions stay
# where trace3.py measured them.
import cv2, numpy as np
from raster import draw_ink
from trace3 import bil


def render(ground, strokes, opts, off):
    can = ground.copy()
    draw_ink(can, strokes, opts, off=off)
    return can


def fit(strokes, ground, target, mask, opts, off=(0, 0), iters=8, sig=1.0, kw=1.6, kv=0.5, wmin=0.3, wmax=9.0,
        ground_fix=True, gsig=3.0, gk=0.8, log=None, fix_tone=True, twoscale=None):
    """twoscale=(s_fine, s_coarse): each stroke's TONE follows the fine-scale residual on its centre-line and each
    point's WIDTH the coarse-scale one (peak darkness vs ink mass)."""
    """strokes: list of flat [x,y,w,v,b,...] (edited in place); ground/target/mask: arrays in the same crop (origin
    `off` in frame px). Returns (strokes, ground, render)."""
    S = [np.asarray(s, np.float64).reshape(-1, 5).copy() for s in strokes]
    M = mask.astype(np.float32)
    Tb = cv2.GaussianBlur(target, (0, 0), sig)
    G = ground.copy()
    for it in range(iters):
        R = render(G, [s.ravel() for s in S], opts, off)
        E = cv2.GaussianBlur(R, (0, 0), sig) - Tb        # > 0: render lighter than the source -> more ink
        if twoscale:
            Ef = cv2.GaussianBlur(R, (0, 0), twoscale[0]) - cv2.GaussianBlur(target, (0, 0), twoscale[0])
            Ec = cv2.GaussianBlur(R, (0, 0), twoscale[1]) - cv2.GaussianBlur(target, (0, 0), twoscale[1])
        if log is not None:
            log.append(float(np.abs(E)[M > 0].mean() * 255))
        for s in S:
            x = s[:, 0] - off[0]; y = s[:, 1] - off[1]
            e = bil(E if not twoscale else Ec, x, y)
            sgn = -1.0 if opts.get('bright') else 1.0      # pale strokes: a render that is too light needs less of them
            c = np.maximum(0.05, np.abs(s[:, 4] - s[:, 3]))  # the stroke's contrast against its ground
            s[:, 2] = np.clip(s[:, 2] * np.exp(np.clip(sgn * kw * e / c, -0.6, 0.6)), wmin, wmax)
            if twoscale and fix_tone:
                ef = float(np.median(bil(Ef, x, y)))
                if opts.get('bright'): s[:, 3] = np.clip(s[:, 3] - kv * ef, s[:, 4] + 0.02, 1)
                else: s[:, 3] = np.clip(s[:, 3] - kv * ef, 0, s[:, 4] - 0.02)
            elif fix_tone:
                # tone: where the render's own line is too light even though it is already wide, darken the stroke
                wide = s[:, 2] > 2.5
                if wide.any():
                    s[:, 3] = np.clip(s[:, 3] - kv * float(np.mean(e[wide])), 0, s[:, 4] - 0.02)
        if ground_fix:
            # the low-frequency remainder goes into the ground (only inside the mask)
            Eg = cv2.GaussianBlur(E * M, (0, 0), gsig) / np.maximum(1e-3, cv2.GaussianBlur(M, (0, 0), gsig))
            G = np.clip(G - gk * Eg * M * 0.5, 0, 1)
    R = render(G, [s.ravel() for s in S], opts, off)
    if log is not None:
        E = cv2.GaussianBlur(R, (0, 0), sig) - Tb; log.append(float(np.abs(E)[M > 0].mean() * 255))
    return [s.ravel().tolist() for s in S], G, R
