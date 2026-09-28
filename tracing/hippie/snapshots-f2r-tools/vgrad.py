# vertical colour profile (pre-grade), median over a small x-window: vgrad.py x y0 y1 step [halfwidth]
import sys, cv2, numpy as np
im = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/page-pre.png')
x, y0, y1, st = [int(v) for v in sys.argv[1:5]]; hw = int(sys.argv[5]) if len(sys.argv) > 5 else 3
horiz = len(sys.argv) > 6
for y in range(y0, y1 + 1, st):
    w = (im[y - 1:y + 2, x - hw:x + hw + 1] if not horiz else im[x - hw:x + hw + 1, y - 1:y + 2]).reshape(-1, 3)
    b, g, r = np.median(w, axis=0).astype(int)
    print(f"{y}:#{r:02x}{g:02x}{b:02x}", end='  ')
print()
