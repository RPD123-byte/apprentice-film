# Inverse of the film's finishing grade (src/lib/post.js), for MEASURING only: source frame (graded) -> estimate of the
# pre-grade drawing, so traced values can be redrawn and graded again by the film's own post pass.
# forward: halation screen (0.5 x blurred highlights) -> S-curve -> vignette -> flicker -> grain.
import numpy as np, cv2

W, H = 2206, 946
qw, qh = round(W / 4), round(H / 4)

def _vig():
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    qx = ((xs + 0.5) / W - 0.5) * 2; qy = ((ys + 0.5) / H - 0.5) * 2
    r = np.clip((qx * qx + qy * qy) / 2, 0, 1)
    return 1 - 0.38 * np.power(r, 1.15)
VIG = _vig()

def flicker(t):
    return 1 + 0.018 * np.sin(t * 2 * np.pi * 0.9) + 0.012 * np.sin(t * 2 * np.pi * 2.3 + 1.0)

# S-curve inverse lookup
_x = np.linspace(0, 1, 4097)
_y = _x * 0.65 + 0.35 * (_x * _x * (3 - 2 * _x))
def s_inv(v):
    return np.interp(np.clip(v, 0, 1), _y, _x)

def halo_field(f):
    """hb for a pre-grade image f (float 0..1, HxW or HxWx3)."""
    s = cv2.resize(f, (qw, qh), interpolation=cv2.INTER_AREA)
    hl = np.clip((s - 120 / 255) / (135 / 255), 0, 1) * s
    b5 = cv2.GaussianBlur(hl, (0, 0), 5); b16 = cv2.GaussianBlur(hl, (0, 0), 16)
    hb = 0.6 * b5 + 0.4 * b16
    return cv2.resize(hb, (W, H), interpolation=cv2.INTER_LINEAR)

def forward(f, t, halo=0.5):
    hb = halo_field(f)
    f1 = 1 - (1 - f) * (1 - halo * hb)
    f2 = f1 * 0.65 + 0.35 * (f1 * f1 * (3 - 2 * f1))
    v = VIG if f.ndim == 2 else VIG[..., None]
    return f2 * v * flicker(t)

def inverse(img, t, halo=0.5, iters=4):
    """img: uint8 graded frame (gray or BGR). returns float pre-grade 0..1 (same shape)."""
    f4 = img.astype(np.float32) / 255
    v = VIG if f4.ndim == 2 else VIG[..., None]
    f2 = f4 / flicker(t) / v
    f1 = s_inv(f2)
    f = f1.copy()
    for _ in range(iters):
        hb = halo_field(f)
        f = 1 - (1 - f1) / np.maximum(1e-3, 1 - halo * hb)
        f = np.clip(f, 0, 1)
    return f
