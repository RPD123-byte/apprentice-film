# Shared helpers for the s19 measuring scripts (not loaded by the film).
# The source frames are graded (halation, S-curve, vignette, flicker, grain: src/lib/post.js is a port of that pass),
# so values measured on them are mapped back through the inverse of the grade's per-pixel part before tracing.
import cv2, numpy as np
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
W, H = 2206, 946
_cap = None
def frame(n, gray=True):
    global _cap
    if _cap is None: _cap = cv2.VideoCapture(V)
    _cap.set(cv2.CAP_PROP_POS_FRAMES, n); ok, s = _cap.read()
    assert ok, n
    return cv2.cvtColor(s, cv2.COLOR_BGR2GRAY).astype(np.float32) if gray else s
def vignette():
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    qx = ((x + 0.5) / W - 0.5) * 2; qy = ((y + 0.5) / H - 0.5) * 2
    r = np.clip((qx * qx + qy * qy) / 2, 0, 1)
    return 1 - 0.38 * r ** 1.15
def flicker(t):
    return 1 + 0.018 * np.sin(t * 2 * np.pi * 0.9) + 0.012 * np.sin(t * 2 * np.pi * 2.3 + 1.0)
_lut = None
def inv_s(y):
    global _lut
    if _lut is None:
        x = np.linspace(0, 1, 4097); f = 0.65 * x + 0.35 * x * x * (3 - 2 * x); _lut = (f, x)
    return np.interp(y, _lut[0], _lut[1])
def halo_of(f0):
    """post.js halation term hb for a pre-grade image f0 (0..1): 4x4 box average at quarter res, highlights above
    120/255, Gaussian sigma 5 and 16 (quarter-res px), 0.6/0.4 mix, upsampled"""
    q = cv2.resize(f0, (W // 4 + (W % 4 > 0) * 0, H // 4), interpolation=cv2.INTER_AREA)
    q = cv2.resize(f0, (round(W / 4), round(H / 4)), interpolation=cv2.INTER_AREA)
    hl = np.clip((q - 120 / 255) / (135 / 255), 0, 1) * q
    b5 = cv2.GaussianBlur(hl, (0, 0), 5); b16 = cv2.GaussianBlur(hl, (0, 0), 16)
    return cv2.resize(0.6 * b5 + 0.4 * b16, (W, H), interpolation=cv2.INTER_LINEAR)
def ungrade(g, t, halo=0.5, iters=3):
    """graded grey 0..255 -> pre-grade value 0..1: undo flicker, vignette, the S-curve and the halation screen"""
    f = inv_s(np.clip(g / 255.0 / flicker(t) / vignette(), 0, 1)).astype(np.float32)
    if not halo: return f
    f0 = f.copy()
    for _ in range(iters):
        hb = halo_of(f0)
        f0 = np.clip(1 - (1 - f) / np.maximum(1e-3, 1 - halo * hb), 0, 1).astype(np.float32)
    return f0
