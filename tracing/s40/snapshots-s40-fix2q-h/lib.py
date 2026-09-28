"""Measurement helpers for s40 fix pass 5 (render vs source, exact frame times)."""
import os, subprocess, numpy as np, cv2

REF = "/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4"
H, W = 946, 2206
HERE = os.path.dirname(os.path.abspath(__file__))


def src(t):
    """Source frame n = round(25 t) as RGB uint8 (cached as png in ref/)."""
    n = int(round(t * 25))
    p = os.path.join(HERE, "ref", f"s-{n}.png")
    if not os.path.exists(p):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{n / 25 - 0.005:.3f}", "-i", REF, "-frames:v", "1", p], check=True)
    return cv2.imread(p)[:, :, ::-1].copy()


def ren(t, d="base"):
    p = os.path.join(HERE, d, f"r-{t:.3f}.png")
    return cv2.imread(p)[:, :, ::-1].copy()


def mean_src(ts):
    return np.mean([src(t).astype(np.float32) for t in ts], axis=0)


def mean_ren(ts, d="base"):
    return np.mean([ren(t, d).astype(np.float32) for t in ts], axis=0)


def bdiff(a, b, box=None, sigma=3):
    a = a.astype(np.float32); b = b.astype(np.float32)
    if box:
        x0, y0, x1, y1 = box
        a = a[y0:y1, x0:x1]; b = b[y0:y1, x0:x1]
    if sigma:
        a = cv2.GaussianBlur(a, (0, 0), sigma); b = cv2.GaussianBlur(b, (0, 0), sigma)
    return float(np.abs(a - b).mean())


def zoom(img, box, k=6):
    x0, y0, x1, y1 = box
    c = np.ascontiguousarray(img[y0:y1, x0:x1]).astype(np.uint8)
    return cv2.resize(c, ((x1 - x0) * k, (y1 - y0) * k), interpolation=cv2.INTER_NEAREST)


def pair(a, b, box, k=6, out=None, grid=10):
    za, zb = zoom(a, box, k), zoom(b, box, k)
    x0, y0, x1, y1 = box
    for z in (za, zb):
        for gx in range((x0 // grid + 1) * grid, x1, grid):
            z[:, (gx - x0) * k] = (z[:, (gx - x0) * k] * 0.6 + np.array([0, 255, 255]) * 0.4).astype(np.uint8)
        for gy in range((y0 // grid + 1) * grid, y1, grid):
            z[(gy - y0) * k, :] = (z[(gy - y0) * k, :] * 0.6 + np.array([0, 255, 255]) * 0.4).astype(np.uint8)
    sep = np.full((za.shape[0], 6, 3), 255, np.uint8)
    im = np.hstack([za, sep, zb])
    if out:
        cv2.imwrite(out, im[:, :, ::-1])
    return im
