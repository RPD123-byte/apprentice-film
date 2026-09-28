# boxerr.py x0 y0 x1 y1 N DIR... : error in a box at frame N (sigma 1, 2, 8)
import cv2, numpy as np, sys
x0, y0, x1, y1, n = map(int, sys.argv[1:6])
b = cv2.cvtColor(cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s07-bt/src/n{n:04d}.png'), cv2.COLOR_BGR2GRAY).astype(np.float32)
for d in sys.argv[6:]:
    a = cv2.cvtColor(cv2.imread(f'{d}/r{n:04d}.png'), cv2.COLOR_BGR2GRAY).astype(np.float32)
    print(d, ' '.join('s%d %.2f' % (s, np.abs(cv2.GaussianBlur(a, (0, 0), s) - cv2.GaussianBlur(b, (0, 0), s))[y0:y1, x0:x1].mean()) for s in (1, 2, 8)), 'mean %+.1f' % (a[y0:y1, x0:x1].mean() - b[y0:y1, x0:x1].mean()))
