# strokestats.py : texture statistics of the source's hatching (for the authored stroke rules; no positions kept).
# On the pre-grade estimate of a frame: ink = where the paper tone (9 px max filter) exceeds the pixel by > 0.08; its
# skeleton split into pieces; per piece: length, mean width (2 x distance to paper along the skeleton), darkest value.
# Aggregated per anchor (40 px grid, pieces whose centre lies within 36 px): median length (length-weighted), median
# width, median value, pieces per 10k px^2.
import numpy as np, cv2
from skimage.morphology import skeletonize
from skimage.measure import label, regionprops
from common import *
THR = 0.18
FAINT = (0.06, 0.18)
def pieces(fr, M, Pimg=None, tier='dark', excl=None):
    P = cv2.GaussianBlur(srcpre(fr) if Pimg is None else Pimg, (0, 0), 0.8); paper = cv2.GaussianBlur(cv2.dilate(P, np.ones((9, 9), np.uint8)), (0, 0), 2)
    Me = cv2.erode(M, np.ones((5, 5), np.uint8)) > 0
    if tier == 'dark': ink = ((paper - P) > THR) & Me
    else:   # faint strokes: in the band, away from the dark strokes' soft edges
        dark = cv2.dilate(((paper - P) > THR).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        ink = ((paper - P) > FAINT[0]) & ((paper - P) <= FAINT[1]) & ~dark & Me
        ink = cv2.morphologyEx(ink.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)) > 0
    sk = skeletonize(ink)
    dt = cv2.distanceTransform(ink.astype(np.uint8), cv2.DIST_L2, 3)
    lab = label(sk, connectivity=2)
    out = []
    for rp in regionprops(lab):
        cc = rp.coords
        if len(cc) < 4: continue
        ys, xs = cc[:, 0], cc[:, 1]
        if excl is not None and (excl[ys, xs] == 0).mean() > 0.4: continue
        out.append((xs.mean(), ys.mean(), len(cc), float(np.median(dt[ys, xs]) * 2), float(np.percentile(P[ys, xs], 25)), float(np.median(paper[ys, xs]))))
    return np.array(out), ink
def stats(fr, M, anchors, R=36, Pimg=None, tier='dark', excl=None):
    Pc, ink = pieces(fr, M, Pimg, tier, excl)
    res = []
    for a in anchors:
        x, y = a[0], a[1]
        if len(Pc) == 0: res.append([0, 0, 0, 0]); continue
        d = np.hypot(Pc[:, 0] - x, Pc[:, 1] - y); s = Pc[d < R]
        area = float(((np.hypot(*np.meshgrid(np.arange(-R, R + 1), np.arange(-R, R + 1))) < R) & (M[max(0, y - R):y + R + 1, max(0, x - R):x + R + 1].shape == (2 * R + 1, 2 * R + 1))).sum()) if False else np.pi * R * R
        mm = M[max(0, y - R):y + R + 1, max(0, x - R):x + R + 1]; frac = mm.mean() if mm.size else 1
        if len(s) == 0: res.append([0, 0, 0, 0]); continue
        L = s[:, 2]; o = np.argsort(L); cw = np.cumsum(L[o]) / L.sum(); Lmed = float(L[o][np.searchsorted(cw, 0.5)])
        res.append([round(Lmed), round(float(np.median(s[:, 3])), 1), round(float(np.median(s[:, 4])), 2), round(float(len(s) / (area * max(0.2, frac)) * 1e4), 1)])
    return res
