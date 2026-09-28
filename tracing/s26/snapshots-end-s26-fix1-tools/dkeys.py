# dkeys.py KEYS: the D ring's key frames — ungraded source key frames where the source is not the arriving page (ring
# shards, ghost), the owl removed and the ring behind it filled from neighbouring frames moved by RING_D (measurement)
import cv2, numpy as np, sys, os
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
import owlmask as o
from gradeio import ungrade
OUT = '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-meas/dkeys/'
os.makedirs(OUT, exist_ok=True)
KEYS = [int(k) for k in sys.argv[1].split(',')]
Fs = list(range(2818, 2843))
U = {F: ungrade(o.src(F), F / 25) for F in Fs}
Z = {F: cv2.dilate(o.zone(F), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21))) | o.sczone(F) for F in Fs}
R = {F: o.ringmask(F)[0] for F in Fs}
for K in KEYS:
    base = U[K].copy(); keep = (R[K] > 0) & (Z[K] == 0)
    fill = (Z[K] > 0).copy()
    for j in sorted(Fs, key=lambda j: abs(j - K)):
        if j == K or abs(j - K) > 6 or not fill.any(): continue
        A = o.ringA(j, K)
        wu = cv2.warpAffine(U[j], A, (2206, 946), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(-1, -1, -1))
        wz = cv2.warpAffine(Z[j], A, (2206, 946), flags=cv2.INTER_NEAREST, borderValue=1)
        wr = cv2.warpAffine(R[j], A, (2206, 946), flags=cv2.INTER_NEAREST, borderValue=0)
        ok = fill & (wz == 0) & (wu[..., 0] >= 0)
        take = ok & (wr > 0)
        base[take] = wu[take]; keep |= take; fill &= ~ok
    # the rest of the owl zone stays empty (the page shows there)
    b8 = np.clip(base * 255 + 0.5, 0, 255).astype(np.uint8)
    cv2.imwrite(OUT + f'k{K}.png', b8); cv2.imwrite(OUT + f'm{K}.png', keep.astype(np.uint8) * 255)
    print(K, 'ring px %.0f%%' % (100 * keep.mean()), flush=True)
