# source owl silhouette while the card stands (57.40–61.44): background difference against the owl-free 57.32/57.36
import sys; sys.path.insert(0, '.')
from lab import src
import numpy as np, cv2
_bg = None
def srcmask(t, thr=22, xmax=None):
    global _bg
    if _bg is None: _bg = cv2.GaussianBlur(np.median(np.stack([src(57.32, True), src(57.36, True)]).astype(np.float32), 0), (0, 0), 1.5)
    f = cv2.GaussianBlur(src(t, True).astype(np.float32), (0, 0), 1.5)
    m = (np.abs(f - _bg) > thr).astype(np.uint8)
    if xmax: m[:, xmax:] = 0
    # the owl's floor shadow is darker than the lit floor: drop dark pixels below the floor line
    m[(f < _bg) & (np.arange(946)[:, None] > 800)] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    ff = m * 255; h, w = m.shape; mk = np.zeros((h + 2, w + 2), np.uint8); f2 = ff.copy(); cv2.floodFill(f2, mk, (0, 0), 255); m = ((ff | (~f2 & 255)) > 0).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n < 2: return m
    i = 1 + np.argmax(st[1:, 4]); return (lab == i).astype(np.uint8)

def gcmask(t, seed, it=5):
    """owl silhouette by GrabCut, seeded by a rendered owl mask `seed` (uint8 0/1): sure fg = seed eroded 25 px,
    probable fg = seed, probable bg = seed dilated 60 px, sure bg elsewhere"""
    img = src(t)
    m = np.full(seed.shape, cv2.GC_BGD, np.uint8)
    m[cv2.dilate(seed, np.ones((121, 121), np.uint8)) > 0] = cv2.GC_PR_BGD
    m[seed > 0] = cv2.GC_PR_FGD
    m[cv2.erode(seed, np.ones((51, 51), np.uint8)) > 0] = cv2.GC_FGD
    ys, xs = np.nonzero(m != cv2.GC_BGD); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    sub = m[y0:y1, x0:x1].copy(); bg = np.zeros((1, 65), np.float64); fg = np.zeros((1, 65), np.float64)
    cv2.grabCut(img[y0:y1, x0:x1], sub, None, bg, fg, it, cv2.GC_INIT_WITH_MASK)
    out = np.zeros(seed.shape, np.uint8); out[y0:y1, x0:x1] = ((sub == cv2.GC_FGD) | (sub == cv2.GC_PR_FGD)).astype(np.uint8)
    out = cv2.morphologyEx(out, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(out)
    if n < 2: return out
    i = 1 + np.argmax(st[1:, 4]); return (lab == i).astype(np.uint8)
