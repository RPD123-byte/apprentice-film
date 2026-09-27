#!/usr/bin/env python3
# plateB2.py SP OUTDIR - the shot-B plates to trace (measurement only):
#  bgB_full.npy - the background in frame coords: the pre-tip owl-free median (SP/bgB_P.npy) and, where the untipped
#                 keyboard hid it, the median of the tip frames 1424-1432 wherever the tipped keyboard (dilated 15 px)
#                 and the flapping wing at the left edge do not cover it (the slats continue down to y ~800)
#  kbB_full.npy - the keyboard canvas (plate x + 260; SP/KBB_P.npy), smoothed 1.2 px right of canvas x 2400 (plate
#                 x 2140), where it was assembled from warped tip frames (their resampling left a dot lattice)
import sys, os, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from common import *
SP, OUT = sys.argv[1], sys.argv[2]
km = np.load(SP + '/KBB_mask.npy').astype(np.float32)
bgB = np.load(SP + '/bgB_P.npy')
kbf = kb_to_frame(km, 1417) > 0.5
WINGX = {1424: 560, 1425: 560, 1426: 560, 1427: 560, 1428: 0, 1429: 240, 1430: 240, 1431: 140, 1432: 0}
S = []; V = []
for n in range(1424, 1433):
    cov = cv2.dilate((kb_to_frame(km, n) > 0.01).astype(np.uint8), np.ones((31, 31), np.uint8)) > 0
    v = ~cov; v[:, :WINGX[n]] = False
    S.append(pre(n)); V.append(v)
S = np.array(S); V = np.array(V)
BG = np.nanmedian(np.where(V, S, np.nan), 0); nv = V.sum(0)
out = np.clip(np.nan_to_num(np.where(kbf & (nv > 0), BG, bgB)), 0, 1).astype(np.float32)
np.save(OUT + '/bgB_full.npy', out)
K = np.load(SP + '/KBB_P.npy').astype(np.float32)
w = np.clip((np.arange(K.shape[1])[None, :] - 2400) / 30, 0, 1).astype(np.float32)
K2 = K * (1 - w) + cv2.GaussianBlur(K, (0, 0), 1.2) * w
np.save(OUT + '/kbB_full.npy', (K2 * (km > 0)).astype(np.float32)); np.save(OUT + '/km.npy', km.astype(np.uint8))
print('ok')
