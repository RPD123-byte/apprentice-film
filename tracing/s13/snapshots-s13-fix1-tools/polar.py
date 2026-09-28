# polar.py FRAMES "outer ellipse" "inner ellipse" NR NA : mean pre-grade value on a (rho, theta) grid between two ellipses
# (rho 0 = outer, 1 = inner; theta measured on the ellipse, 0 = +x, pi/2 = +y); prints a table
import sys, numpy as np, cv2
from common import *
fr = sys.argv[1]; E0 = [float(v) for v in sys.argv[2].split(',')]; E1 = [float(v) for v in sys.argv[3].split(',')]; NR, NA = int(sys.argv[4]), int(sys.argv[5])
P = srcpre(fr)
def pt(E, a):
    cx, cy, rx, ry, rot = E; ex, ey = rx * np.cos(a), ry * np.sin(a); return cx + ex * np.cos(rot) - ey * np.sin(rot), cy + ex * np.sin(rot) + ey * np.cos(rot)
print('theta\\rho ' + ' '.join(f'{(i + 0.5) / NR:5.2f}' for i in range(NR)))
for j in range(NA):
    row = []
    for i in range(NR):
        vals = []
        for a in np.linspace(2 * np.pi * j / NA, 2 * np.pi * (j + 1) / NA, 8, endpoint=False):
            for rr in np.linspace(i / NR, (i + 1) / NR, 4, endpoint=False):
                p0 = pt(E0, a); p1 = pt(E1, a); x = p0[0] + (p1[0] - p0[0]) * rr; y = p0[1] + (p1[1] - p0[1]) * rr
                if 0 <= x < 2205 and 0 <= y < 945: vals.append(cv2.getRectSubPix(P, (1, 1), (float(x), float(y)))[0, 0])
        row.append(np.mean(vals) if vals else np.nan)
    print(f'{np.degrees(2 * np.pi * (j + 0.5) / NA):7.0f}   ' + ' '.join(f'{v:5.2f}' for v in row))
