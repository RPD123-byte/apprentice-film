# Build the measuring plates for the s19 room (scratch output only; never loaded by the film).
#   A = mean of 57.32/57.36 (card standing, floor lit, no owl yet)   B = 63.08 (card lifted: the room behind it)
# Both frames carry the card's halo (measured: +105 grey at the paper edge, 85 at 20 px, 46 at 45 px, 17 at 80 px,
# 0 by ~120 px); it is subtracted as a function of the distance to that frame's card edge before ungrading.
# C = the room without the card: per pixel the frame whose card is further away. L = the lit floor (A − C > 0).
import sys, numpy as np, cv2
from common import frame, ungrade, W, H
out = sys.argv[1]
# the card's glow in VALUE space (after ungrading incl. the halation screen), measured left of the standing card
# (A − B, where B has no card there): 0.31 at 10 px, 0.24 at 20, 0.18 at 30, 0.12 at 45, 0.067 at 60, 0.023 at 80
HALO_D = np.array([0, 10, 15, 20, 30, 45, 60, 80, 100, 130, 160], float)
HALO_V = np.array([0.33, 0.31, 0.28, 0.244, 0.182, 0.121, 0.067, 0.023, 0.013, 0.006, 0.0], float)
yy, xx = np.mgrid[0:H, 0:W]
gA = np.mean([frame(1433), frame(1434)], 0)
gB = frame(1577)
# distance outside the card's paper quad (card.js CARD_TAB at 57.32 and at 63.08)
def dist_out(q):
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.round(np.array(q) * 4).astype(np.int32)], 1, shift=2)
    return m, cv2.distanceTransform(1 - m, cv2.DIST_L2, 5)
paper, dA = dist_out([[1086.7, 77.2], [1584.6, 48.7], [1690.4, 804.2], [986.4, 775.0]])
paperB, dB = dist_out([[1613.2, -36.9], [2045.6, -598.3], [2892.2, 649.7], [2138.1, 676.5]])
owlB = ((xx > 1880) & (yy > 330) & (yy < 800)).astype(np.uint8)
# below the standing card's bottom edge the floor is lit by the card (its rays): that light stays in the plate (the
# 'lit' layer carries it); the render's glow is cut off there too
floor = yy > 772 + (xx - 995) * 0.04 - 4
A = np.clip(ungrade(gA, 57.34) - np.where(floor, 0, np.interp(dA, HALO_D, HALO_V)), 0, 1).astype(np.float32)
B = np.clip(ungrade(gB, 63.08) - np.interp(np.maximum(dB, 0), HALO_D, HALO_V), 0, 1).astype(np.float32)
useB = (dB > dA) & (dB > 25) & (owlB == 0)
C = np.where(useB, B, A)
bad = ((np.maximum(np.where(owlB > 0, -1, dB), dA)) < 25).astype(np.uint8)    # both frames too close to a card
# lit floor: where A is brighter than B on the floor (both away from the cards)
L = np.clip(A - B, 0, 1) * ((dA > 25) & (dB > 25) & (owlB == 0) & (yy > 690))
np.savez_compressed(out, A=A, B=B, C=C, L=L.astype(np.float32), useB=useB, bad=bad, paper=paper, dA=dA, dB=dB)
print('useB', useB.mean().round(3), 'bad', bad.mean().round(4))
vis = np.dstack([np.clip(C, 0, 1) * 255] * 3).astype(np.uint8)
vis[bad > 0] = (vis[bad > 0] * 0.5 + np.array([0, 0, 128])).astype(np.uint8)
cv2.imwrite(out.replace('.npz', '-C.jpg'), cv2.resize(vis, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA))
cv2.imwrite(out.replace('.npz', '-L.jpg'), cv2.resize(np.clip(L * 3 * 255, 0, 255).astype(np.uint8), None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA))
