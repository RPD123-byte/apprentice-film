#!/usr/bin/env python3
# s02 owl as outlines (measurement script, not loaded by the film). The owl in this shot is one drawing held still
# (sitting) or moved as a whole (flying), so it is measured as three still drawings, each split into seven brightness
# levels (paint > 0.1 / 0.22 / 0.36 / 0.52 / 0.68 / 0.8 / 0.86 / 0.9 / 0.93 / 0.96) inside the owl's own silhouette and vectorized at 2x as
# contours with holes (mean value per band):
#   SIT      the sitting owl, eyes open: frames 362–378 (14.48–15.12 s) at the static hold (hold-frame coords)
#   SIT_HALF / SIT_SHUT   the eye region only: frames 380+390+391 (heavy lids) / 381–389 (shut)
#   FLY      the flying owl without its wings, eyes shut, in owl units: the median of frames 446–478 (17.84–19.12 s)
#            warped into the owl's own frame with the measured root track (wing_local.py)
# Shapes and values only — no pixels are stored.
# Usage: trace_owl.py out.json dbgdir
import cv2, numpy as np, json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wing_local as wl, invgrade as ig, levels as lv
out, dbg = sys.argv[1:3]; os.makedirs(dbg, exist_ok=True)
LEV = [0.1, 0.22, 0.36, 0.52, 0.68, 0.8, 0.86, 0.9, 0.93, 0.96]
cap = cv2.VideoCapture(wl.V)
def frames(fs, t):
    acc = []
    for f in fs:
        cap.set(cv2.CAP_PROP_POS_FRAMES, f); ok, im = cap.read(); acc.append(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255)
    return ig.paint_of(np.mean(acc, 0), t)
def fill_holes(m):
    ff = m.copy(); h, w = m.shape; mask = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(ff, mask, (0, 0), 1); return m | (1 - ff)

def levels(P, region, off, name):
    H, W = P.shape
    P2 = cv2.resize(P, (W * 2, H * 2), interpolation=cv2.INTER_CUBIC)
    R2 = cv2.resize(region, (W * 2, H * 2), interpolation=cv2.INTER_NEAREST)
    ms = []
    for t in LEV:
        m = ((P2 > t) & (R2 > 0)).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)); ms.append(m)
    res = []
    for k, m in enumerate(ms):
        band = m & (1 - ms[k + 1]) if k + 1 < len(ms) else m
        L = lv.vectorize(P2, m, band, off=off); res.append(L)
    print(name, [len(L) for L in res], sum(len(q) for L in res for s in L for q in s['r']), 'points', flush=True)
    return res

res = {}
# ---- sitting (hold-frame coords; the camera is still 14.48–16.52)
A = frames(range(362, 379), 14.8)
H, W = A.shape
m = fill_holes(cv2.morphologyEx((cv2.GaussianBlur(A, (0, 0), 1.5) > 0.35).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8)))
n, lab, st, _ = cv2.connectedComponentsWithStats(m); m = (lab == lab[200, 1088]).astype(np.uint8); m[333:] = 0
ell = np.zeros_like(m); cv2.ellipse(ell, (1088, 196), (130, 146), 0, 0, 360, 1, -1)       # headphone band and cups
talons = np.zeros_like(m); talons[326:360, 1015:1168] = 1
talons = talons & cv2.dilate((cv2.GaussianBlur(A, (0, 0), 1.0) > 0.62).astype(np.uint8), np.ones((3, 3), np.uint8))   # the white talons, not the box face
sil = m | ((A > 0.1) & (ell > 0) & (np.arange(H)[:, None] < 333)).astype(np.uint8) | talons
sil = cv2.morphologyEx(sil, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
cv2.imwrite(f'{dbg}/sit-sil.png', sil * 255)
res['sit'] = levels(A, sil, (0, 0), 'sit')
eyes = np.zeros_like(m); cv2.ellipse(eyes, (1087, 186), (74, 34), 0, 0, 360, 1, -1)
res['sit_half'] = levels(frames([380, 390, 391], 15.4), eyes & sil, (0, 0), 'sit_half')
res['sit_shut'] = levels(frames(range(381, 390), 15.4), eyes & sil, (0, 0), 'sit_shut')
# ---- flying (owl units: the median of the aligned frames)
M = np.median(np.stack([wl.local(f)[0] for f in range(446, 479)]), 0)
U0, V0 = wl.U0, wl.V0
reg = np.zeros(M.shape, np.uint8)
E = lambda cu, cv, ru, rv: cv2.ellipse(reg, (cu - U0, cv - V0), (ru, rv), 0, 0, 360, 1, -1)
vv = np.arange(M.shape[0])[:, None] + V0; uu = np.arange(M.shape[1])[None, :] + U0
E(0, -112, 182, 158)                                           # head, cups, band
inner = np.zeros_like(reg); cv2.ellipse(inner, (-U0, -112 - V0), (150, 128), 0, 0, 360, 1, -1)
reg[(np.abs(uu) > 126) & ~((vv < -60) & (inner == 0))] = 0     # only the band's arc beyond the head's sides...
cv2.ellipse(reg, (-140 - U0, -84 - V0), (40, 70), 0, 0, 360, 1, -1); cv2.ellipse(reg, (140 - U0, -84 - V0), (40, 70), 0, 0, 360, 1, -1)   # ...and the cups
E(0, 48, 130, 128)                                             # body
feet = np.zeros_like(reg); cv2.rectangle(feet, (-85 - U0, 150 - V0), (92 - U0, 240 - V0), 1, -1)
reg |= feet & (cv2.GaussianBlur(M, (0, 0), 1.0) > 0.3).astype(np.uint8)       # feet (not the dark round them)
cv2.fillPoly(reg, [np.array([[70, 150], [150, 140], [195, 160], [170, 185], [80, 185]]) - [U0, V0]], 1)   # tail
cv2.imwrite(f'{dbg}/fly-reg.png', reg * 255)
res['fly'] = levels(M, reg, (2 * U0, 2 * V0), 'fly')            # half-units, origin = the root
json.dump(res, open(out, 'w'))
