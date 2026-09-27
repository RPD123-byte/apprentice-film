# Python model of src/lib/post.js (the global finish): halation, S-curve, vignette. Used to estimate the ungraded ink
# value of a measured stroke (measurement helper only).
import cv2, numpy as np
W, H = 2206, 946
def _blur(img, s):
    r = int(min(48, 3 * s)); x = np.arange(-r, r + 1); k = np.exp(-0.5 * x * x / (s * s)); k /= k.sum()
    return cv2.sepFilter2D(img, -1, k, k, borderType=cv2.BORDER_REPLICATE)
def halo_map(f):
    """f: float image 0..1 (H,W). Returns hb (H,W): the soft highlight map the grade screens in."""
    qw, qh = round(W / 4), round(H / 4)
    s = cv2.resize(f, (qw, qh), interpolation=cv2.INTER_AREA)
    hl = np.clip((s - 120 / 255) / (135 / 255), 0, 1) * s
    hb = 0.6 * _blur(hl, 5) + 0.4 * _blur(hl, 16)
    return cv2.resize(hb, (W, H), interpolation=cv2.INTER_LINEAR)
def vignette():
    y, x = np.mgrid[0:H, 0:W]; qx = ((x + 0.5) / W - 0.5) * 2; qy = ((y + 0.5) / H - 0.5) * 2
    r = np.clip((qx * qx + qy * qy) / 2, 0, 1); return 1 - 0.38 * r ** 1.15
def scurve(f): return f * 0.65 + 0.35 * (f * f * (3 - 2 * f))
def inv_scurve(y):
    y = np.clip(y, 0, 1); f = y.copy()
    for _ in range(30):
        g = scurve(f) - y; dg = 0.65 + 0.35 * 6 * f * (1 - f); f = np.clip(f - g / dg, 0, 1)
    return f
def grade(f, halo=0.5):
    hb = halo_map(f); g = 1 - (1 - f) * (1 - halo * hb); g = scurve(g); return g * vignette()
def ungrade(post, hb=None, halo=0.5):
    """post: graded 0..1. Estimate the pre-grade value (hb estimated from the graded image itself if not given)."""
    v = vignette(); y = np.clip(post / v, 0, 1); pre_h = inv_scurve(y)
    if hb is None: hb = halo_map(post)
    return np.clip(1 - (1 - pre_h) / (1 - halo * hb), 0, 1), hb
