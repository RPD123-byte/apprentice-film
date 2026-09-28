"""numpy port of src/lib/post.js (no grain) + local inverse, for s40 fix pass 5."""
import numpy as np, cv2, math

W, H = 2206, 946
QW, QH = round(W / 4), round(H / 4)


def _blur_q(img, sigma):
    return cv2.GaussianBlur(img, (0, 0), sigma, borderType=cv2.BORDER_REPLICATE)


def halation(pre):
    """hb (0..1 float, full res) from a pre-grade RGB uint8/float image."""
    f = pre.astype(np.float32) / 255.0
    q = cv2.resize(f, (QW, QH), interpolation=cv2.INTER_AREA)
    hl = np.clip((q - 120 / 255) / (135 / 255), 0, 1) * q
    b5 = _blur_q(hl, 5); b16 = _blur_q(hl, 16)
    hb = 0.6 * b5 + 0.4 * b16
    return cv2.resize(hb, (W, H), interpolation=cv2.INTER_LINEAR)


def vig_flick(t):
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    qx = ((xs + 0.5) / W - 0.5) * 2; qy = ((ys + 0.5) / H - 0.5) * 2
    r = np.clip((qx * qx + qy * qy) / 2, 0, 1)
    v = 1 - 0.38 * r ** 1.15
    fl = 1 + 0.018 * math.sin(t * 6.2831853 * 0.9) + 0.012 * math.sin(t * 6.2831853 * 2.3 + 1.0)
    return (v * fl)[..., None]


def grade(pre, t, halo=0.5, hb=None):
    f = pre.astype(np.float32) / 255.0
    if hb is None: hb = halation(pre)
    f = 1 - (1 - f) * (1 - halo * hb)
    f = f * 0.65 + 0.35 * (f * f * (3 - 2 * f))
    f = f * vig_flick(t)
    return np.clip(f, 0, 1) * 255


def s_inv(y):
    # invert y = 0.65 x + 0.35 x^2 (3 - 2 x) by Newton
    x = y.copy()
    for _ in range(20):
        fx = 0.65 * x + 0.35 * x * x * (3 - 2 * x) - y
        d = 0.65 + 0.35 * (6 * x - 6 * x * x)
        x = np.clip(x - fx / d, 0, 1)
    return x


def inverse(graded, t, hb, x, y, halo=0.5, bias=2.0):
    """pre-grade colour (0..255) that grades to `graded` (RGB, 0..255) at pixel (x, y) given the halation map hb.
    bias: the card grain's mean darkening (levels, graded) that grain.js adds."""
    g = (np.asarray(graded, np.float32) + bias) / 255.0
    vf = vig_flick(t)[int(y), int(x), 0]
    f3 = np.clip(g / vf, 0, 1)
    f2 = s_inv(f3)
    h = hb[int(y), int(x)]
    f = 1 - (1 - f2) / (1 - halo * h)
    return np.clip(f * 255, 0, 255)


import functools
vig_flick = functools.lru_cache(8)(vig_flick)


def hex3(c):
    return "#" + "".join(f"{int(round(v)):02x}" for v in c)
