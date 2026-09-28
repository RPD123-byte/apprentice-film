# emap.py DIR frame x0 y0 x1 y1 [bs=20] [sig=8]: print sigma-blurred block error (render - source) on a grid
import cv2, numpy as np, sys
S = '/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src'
d, f = sys.argv[1], sys.argv[2]; x0, y0, x1, y1 = map(int, sys.argv[3:7])
bs = int(sys.argv[7]) if len(sys.argv) > 7 else 20; sg = float(sys.argv[8]) if len(sys.argv) > 8 else 8
r = cv2.imread(f'{d}/r{f}.png', 0).astype(np.float32); s = cv2.imread(f'{S}/f{f}.png', 0).astype(np.float32)
if sg > 0: r, s = cv2.GaussianBlur(r, (0, 0), sg), cv2.GaussianBlur(s, (0, 0), sg)
e = r - s
print('      ' + ''.join(f'{x:6d}' for x in range(x0, x1, bs)))
for y in range(y0, y1, bs):
    print(f'{y:5d} ' + ''.join(f'{e[y:y+bs, x:x+bs].mean():+6.0f}' for x in range(x0, x1, bs)))
print('mae', np.abs(e[y0:y1, x0:x1]).mean(), 'dm', e[y0:y1, x0:x1].mean())
