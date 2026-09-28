import sys, os, re, numpy as np, cv2
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s02/trace')
sys.path.insert(0, '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s02fx')
import wing_local as wl
from common import frame, extract
import invgrade as ig
U0, U1, V0, V1 = -300, 300, -300, 260
def local2(f, S=2, graded=False, extra=None):
    # warp source frame f into owl units at S px per unit, window U0..U1 x V0..V1; extra = (du, dv, dscale, drot) refinement
    t = f / 25; P = frame(f)
    if not graded: P = ig.paint_of(P, t)
    x, y, s, rot = wl.spline(t, 1), wl.spline(t, 2), wl.spline(t, 3), wl.spline(t, 4)
    if extra is not None:
        du, dv, dsc, dr = extra
        c, sn = np.cos(rot), np.sin(rot); x, y = x + s * (c * du - sn * dv), y + s * (sn * du + c * dv); s *= dsc; rot += dr
    c, sn = np.cos(rot), np.sin(rot); k = s / S
    # local px (i, j): u = U0 + i/S, v = V0 + j/S; frame = root + s R (u, v)
    M = np.array([[k * c, -k * sn, x + s * (c * U0 - sn * V0)], [k * sn, k * c, y + s * (sn * U0 + c * V0)]], np.float32)
    return cv2.warpAffine(P.astype(np.float32), M, ((U1 - U0) * S, (V1 - V0) * S), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderValue=0)
