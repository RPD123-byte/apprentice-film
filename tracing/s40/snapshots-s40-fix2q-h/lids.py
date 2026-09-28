import sys
from lib import *
d = sys.argv[1]
f = lambda I: cv2.GaussianBlur(0.299*I[...,0]+0.587*I[...,1]+0.114*I[...,2], (0,0), 0.7)
def lash(I, x, y0=282, y1=318):
    L = f(I)
    col = L[y0:y1, x-1:x+2].mean(1)
    for i in range(len(col)):
        if col[i] < 110: return y0 + i
    return None
print('t       Lsrc(1552,1560,1568)   Lren        Rsrc(1606,1615,1624)   Rren')
for t in [139.0,139.08,139.12,139.16,139.2,139.24,139.28,139.32,139.36,139.4,139.6]:
    S = src(t); R = ren(t, d)
    print(f'{t:.2f}  ', [lash(S,x) for x in (1552,1560,1568)], [lash(R,x) for x in (1552,1560,1568)], '  ', [lash(S,x) for x in (1606,1615,1624)], [lash(R,x) for x in (1606,1615,1624)])
