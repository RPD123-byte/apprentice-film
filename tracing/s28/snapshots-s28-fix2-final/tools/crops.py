# render|source crops. Usage: crops.py DIR x0 y0 x1 y1 out.jpg [maxw]
import cv2, numpy as np, sys, glob, re
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28d-tools')
from lib import src
d = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); out = sys.argv[6]; mw = int(sys.argv[7]) if len(sys.argv) > 7 else 1800
fs = sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
rows = []
for p in fs:
    t = float(re.search(r'at-([\d.]+)s', p).group(1))
    r = cv2.imread(p)[y0:y1, x0:x1]; s = src(t)[y0:y1, x0:x1]
    row = np.hstack([r, np.full((y1 - y0, 6, 3), (0, 0, 255), np.uint8), s])
    cv2.putText(row, f'{t:.2f}', (8, 30), 0, 1, (0, 0, 255), 2)
    rows.append(row)
im = np.vstack(rows)
if im.shape[1] > mw: im = cv2.resize(im, (mw, int(im.shape[0] * mw / im.shape[1])))
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 88])
