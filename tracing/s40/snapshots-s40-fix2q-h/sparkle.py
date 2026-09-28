import sys, numpy as np, cv2
from lib import *
import re
SP=eval(re.search(r"SPARKLES = (\[.*?\]);", open("/Users/computer/rootline/apprentice-film/src/shots/s40/data.js").read()).group(1))
SP0=[[73.5, 87, 30, 34], [115, 142.5, 9.5, 14], [183, 394, 17.5, 22.5], [1927, 95, 28.5, 32.5], [2084.5, 298.5, 25, 31], [1970, 515, 14.5, 16.5]]
def measure(I, x, y, rx, ry):
    L = 0.299*I[...,0]+0.587*I[...,1]+0.114*I[...,2]
    R = int(max(rx, ry) * 1.8) + 6
    x0, y0 = int(round(x)), int(round(y))
    c = L[y0-R:y0+R+1, x0-R:x0+R+1]
    # background: ring median
    yy, xx = np.mgrid[-R:R+1, -R:R+1]
    rr = np.hypot(xx, yy)
    bg = np.median(c[(rr > R - 4)])
    pk = c[R-2:R+3, R-2:R+3].max()
    thr = bg + 0.25 * (pk - bg)
    # arms along +-x and +-y (average of 3 rows/cols)
    row = L[y0-1:y0+2, x0-R:x0+R+1].mean(0); col = L[y0-R:y0+R+1, x0-1:x0+2].mean(1)
    def ext(v):
        m = len(v)//2
        r = m
        while r < len(v)-1 and v[r] > thr: r += 1
        l = m
        while l > 0 and v[l] > thr: l -= 1
        return (r - m, m - l)
    ex, ey = ext(row), ext(col)
    # FWHM of the ray at 40% and 70% of the arm length (vertical arm), horizontally
    fw = []
    for frac in (0.4, 0.7):
        yy_ = int(round(y0 - frac * ey[1]))
        prof = L[yy_, x0-10:x0+11]
        b2 = bg; p2 = prof.max(); h = b2 + 0.5*(p2-b2)
        fw.append(int((prof > h).sum()))
    return bg, pk, ex, ey, fw
if __name__ == "__main__":
    d = sys.argv[1] if len(sys.argv) > 1 else "base"
    S = mean_src([137.6 + 0.08*i for i in range(9)])
    Rm = mean_ren([137.28,137.44,137.6,137.76,137.92,138.08], d)
    for (x, y, rx, ry) in SP0:
        s = measure(S, x, y, rx, ry); r = measure(Rm, x, y, rx, ry)
        print(f"({x},{y}) src bg {s[0]:.0f} pk {s[1]:.0f} x+-{s[2]} y+-{s[3]} fw {s[4]}   ren bg {r[0]:.0f} pk {r[1]:.0f} x+-{r[2]} y+-{r[3]} fw {r[4]}")
