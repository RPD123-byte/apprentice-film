# Inverse of the film's global grade (src/lib/post.js): flicker, vignette, S-curve, halation. Frame -> paint estimate.
import cv2, numpy as np
W, H = 2206, 946
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
    hb = 0.6 * cv2.GaussianBlur(hl, (0, 0), 5) + 0.4 * cv2.GaussianBlur(hl, (0, 0), 16)
    return cv2.resize(hb, (W, H), interpolation=cv2.INTER_LINEAR)
def paint_of(y, t):
    fh = invS(y / flick(t) / VIG)
    f = fh.copy()
    for _ in range(3):
        hb = halo_of(f)
        f = 1 - (1 - fh) / np.maximum(0.2, 1 - 0.5 * hb)
    return np.clip(f, 0, 1)
