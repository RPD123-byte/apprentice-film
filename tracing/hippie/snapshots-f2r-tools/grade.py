# F2 rerun measuring helpers (scratch). Forward and inverse of the film's finish grade (src/lib/post.js), so source
# colours can be read as pre-grade inks (measurement only; nothing here is used by the film).
import cv2, numpy as np

def scurve(f): return f * 0.65 + 0.35 * (f * f * (3 - 2 * f))
_X = np.linspace(0, 1, 4096); _Y = scurve(_X)
def inv_scurve(y): return np.interp(y, _Y, _X)

def vignette(H, W):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    q = (((xx + 0.5) / W - 0.5) * 2) ** 2 + (((yy + 0.5) / H - 0.5) * 2) ** 2
    return 1 - 0.38 * np.clip(q / 2, 0, 1) ** 1.15

def flicker(t): return 1 + 0.018 * np.sin(t * 2 * np.pi * 0.9) + 0.012 * np.sin(t * 2 * np.pi * 2.3 + 1)

def halo_of(f):  # f: float 0..1 RGB/BGR
    H, W = f.shape[:2]
    hl = np.clip((f - 120 / 255) / (135 / 255), 0, 1) * f
    q = cv2.resize(hl, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    b = 0.6 * cv2.GaussianBlur(q, (0, 0), 5) + 0.4 * cv2.GaussianBlur(q, (0, 0), 16)
    return cv2.resize(b, (W, H), interpolation=cv2.INTER_LINEAR)

def grade(pre, t, halo=0.5):
    f = pre.astype(np.float32)
    hb = halo_of(f)
    f = 1 - (1 - f) * (1 - halo * hb)
    f = scurve(f)
    f = f * vignette(*f.shape[:2])[..., None]
    return np.clip(f * flicker(t), 0, 1)

def ungrade(img_u8, t, halo=0.5, iters=3):
    f = img_u8.astype(np.float32) / 255
    f = f / flicker(t)
    f = f / vignette(*f.shape[:2])[..., None]
    f = inv_scurve(np.clip(f, 0, 1)).astype(np.float32)
    g = f.copy()
    for _ in range(iters):
        hb = halo_of(g)
        g = 1 - (1 - f) / np.maximum(1 - halo * hb, 1e-3)
    return np.clip(g, 0, 1).astype(np.float32)

def frame(t, path=None):
    V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
    c = cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES, int(round(t * 25))); ok, f = c.read()
    return f
