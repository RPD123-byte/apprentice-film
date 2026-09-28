# s28 (drawn rebuild) measuring helpers. Source frames are read for MEASURING only (positions, colours, motion).
import cv2, numpy as np, os, functools
V = os.environ.get('REF', '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4')
W, H = 2206, 946
_cap = None

@functools.lru_cache(maxsize=64)
def _src(k):
    global _cap
    if _cap is None: _cap = cv2.VideoCapture(V)
    _cap.set(cv2.CAP_PROP_POS_FRAMES, k); ok, f = _cap.read()
    assert ok, k
    return f

def src(t):
    """source frame (BGR uint8) shown at film time t (25 fps grid, same frame the snapshot tool pairs with)."""
    return _src(int(round(t * 25))).copy()

def rgb(img): return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

# ---------- the film grade (post.js), without grain ----------
def _hi(f):
    q = cv2.resize(f, (round(W / 4), round(H / 4)), interpolation=cv2.INTER_AREA)
    return np.clip((q - 120 / 255) / (135 / 255), 0, 1) * q

def _blur(q, s):
    return cv2.GaussianBlur(q, (0, 0), s, borderType=cv2.BORDER_REPLICATE)

_vig = None
def vignette():
    global _vig
    if _vig is None:
        ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
        qx = ((xs + 0.5) / W - 0.5) * 2; qy = ((ys + 0.5) / H - 0.5) * 2
        r = np.clip((qx * qx + qy * qy) / 2, 0, 1)
        _vig = (1 - 0.38 * r ** 1.15)[..., None]
    return _vig

def flicker(t): return 1 + 0.018 * np.sin(t * 2 * np.pi * 0.9) + 0.012 * np.sin(t * 2 * np.pi * 2.3 + 1.0)

def grade(f, t, halo=0.5):
    """f: float RGB/BGR 0..1 pre-grade -> graded (channel order preserved)."""
    q = _hi(f)
    hb = 0.6 * _blur(q, 5) + 0.4 * _blur(q, 16)
    hb = cv2.resize(hb, (W, H), interpolation=cv2.INTER_LINEAR)
    g = 1 - (1 - f) * (1 - halo * hb)
    g = g * 0.65 + 0.35 * (g * g * (3 - 2 * g))
    g = g * vignette() * flicker(t)
    return np.clip(g, 0, 1)

def ungrade(g, t, halo=0.5, iters=12):
    """estimate the pre-grade image whose grade is g (float 0..1)."""
    p = g.copy()
    for _ in range(iters):
        d = g - grade(p, t, halo)
        p = np.clip(p + d * 1.1, 0, 1)
    return p

def blurdiff(a, b, s):
    """mean abs difference of the two images blurred at sigma s (8-bit levels)."""
    A = cv2.GaussianBlur(a.astype(np.float32), (0, 0), s); B = cv2.GaussianBlur(b.astype(np.float32), (0, 0), s)
    return float(np.abs(A - B).mean())
