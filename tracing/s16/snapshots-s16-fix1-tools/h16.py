# s16 scratch: source cache + metrics (not part of the film)
import sys, os, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s16/trace')
import grade as GR
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
C = '/Users/computer/rootline/apprentice-film/snapshots/s16-fix1-src'
os.makedirs(C, exist_ok=True)
def src(n):
    """graded source frame n (BGR uint8)"""
    p = f'{C}/f{n}.png'
    if not os.path.exists(p):
        c = cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES, n); ok, f = c.read(); cv2.imwrite(p, f)
    return cv2.imread(p)
def pre(n):
    """pre-grade luminance 0..1 of source frame n"""
    p = f'{C}/p{n}.npy'
    if not os.path.exists(p):
        im = src(n)[..., ::-1].astype(np.float32) / 255
        np.save(p, GR.ungrade(im, n / 25.0).mean(2).astype(np.float32))
    return np.load(p)
def grade(raw_bgr, n, halo=0.5):
    f = raw_bgr[..., ::-1].astype(np.float32) / 255
    return (GR.grade(f, n / 25.0, halo) * 255)[..., ::-1]
def gray(im): return cv2.cvtColor(np.clip(im, 0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
def errs(a, b, roi=None, sig=(1, 2, 4, 8)):
    if roi: x0, y0, x1, y1 = roi; a = a[y0:y1, x0:x1]; b = b[y0:y1, x0:x1]
    return [float(np.abs(cv2.GaussianBlur(a, (0, 0), s) - cv2.GaussianBlur(b, (0, 0), s)).mean()) for s in sig]
def emap(a, b, s=4): return np.abs(cv2.GaussianBlur(a, (0, 0), s) - cv2.GaussianBlur(b, (0, 0), s))
