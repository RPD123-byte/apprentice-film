# ckeys.py: the C shard field's key backgrounds — ungraded source key frames with the owl and the flung scissors removed
# (filled from the neighbouring frames, moved by the field's measured affine), saved as PNG under meas/ckeys (measurement)
import cv2, numpy as np, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
import owlmask as o
from gradeio import ungrade
OUT = '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-meas/ckeys/'
import os; os.makedirs(OUT, exist_ok=True)
KEYS = [int(k) for k in sys.argv[1].split(',')]
Fs = [F for F in range(2791, 2818) if F != 2795]
U = {F: ungrade(o.src(F), F / 25) for F in Fs}
def dyn(F):
    z = cv2.dilate(o.zone(F), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (33, 33))) | o.sczone(F)
    return z
D = {F: dyn(F) for F in Fs}
for K in KEYS:
    base = U[K].copy(); fill = D[K] > 0
    for j in sorted(Fs, key=lambda j: abs(j - K)):
        if j == K or not fill.any(): continue
        A = (o.M3(o.CAM[K]) @ np.linalg.inv(o.M3(o.CAM[j])))[:2]    # j-frame -> K-frame
        wu = cv2.warpAffine(U[j], A, (2206, 946), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(-1, -1, -1))
        wd = cv2.warpAffine(D[j], A, (2206, 946), flags=cv2.INTER_NEAREST, borderValue=1)
        ok = fill & (wd == 0) & (wu[..., 0] >= 0)
        base[ok] = wu[ok]; fill &= ~ok
    b8 = np.clip(base * 255 + 0.5, 0, 255).astype(np.uint8)
    if fill.any(): b8 = cv2.inpaint(b8, fill.astype(np.uint8) * 255, 5, cv2.INPAINT_TELEA)
    cv2.imwrite(OUT + f'k{K}.png', b8); cv2.imwrite(OUT + f'hole{K}.png', fill.astype(np.uint8) * 255)
    print(K, 'unfilled px', int(fill.sum()), flush=True)
