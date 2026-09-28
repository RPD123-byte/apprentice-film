# Flood-fill segmentation bounded by ink lines (measurement aid for the layer masks).
# seg(Y, seeds, box, thr_rel, thr_abs, close_r, grow) -> binary mask (full frame)
import numpy as np, cv2
from scipy import ndimage as ndi

def ink_map(Y, thr_rel=0.10, thr_abs=0.18, sig=0.8, bgr=6):
    Ys = cv2.GaussianBlur(Y, (0, 0), sig)
    bg = cv2.dilate(Ys, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*bgr+1, 2*bgr+1)))
    return ((bg - Ys) > thr_rel) | (Ys < thr_abs)

def seg(Y, seeds, box=None, thr_rel=0.10, thr_abs=0.18, close_r=2, grow=3, barrier=None, extra_barrier=None):
    H, W = Y.shape
    ink = ink_map(Y, thr_rel, thr_abs) if barrier is None else barrier
    if extra_barrier is not None: ink = ink | extra_barrier
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*close_r+1, 2*close_r+1))
    bar = cv2.dilate(ink.astype(np.uint8), k) > 0
    free = ~bar
    if box is not None:
        bm = np.zeros((H, W), bool); x0, y0, x1, y1 = box; bm[y0:y1, x0:x1] = True; free &= bm
    lab, n = ndi.label(free)
    m = np.zeros((H, W), bool)
    for (x, y) in seeds:
        l = lab[int(y), int(x)]
        if l > 0: m |= lab == l
    g = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*(close_r+grow)+1, 2*(close_r+grow)+1))
    m = cv2.dilate(m.astype(np.uint8), g) > 0
    m = ndi.binary_fill_holes(m)
    if box is not None: m &= bm
    return m

def polygonize(m, eps=0.8, minarea=30):
    cs, h = cv2.findContours(m.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cs:
        if abs(cv2.contourArea(c)) < minarea: continue
        a = cv2.approxPolyDP(c, eps, True)[:, 0, :]
        if len(a) >= 3: out.append(a.tolist())
    return out
