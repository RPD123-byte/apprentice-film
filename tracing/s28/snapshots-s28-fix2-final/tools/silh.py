# hood-silhouette comparison: per row leftmost green-hood x and per column topmost hood y, render vs source.
# Usage: silh.py DIR T [x0 x1 y0 y1]
import cv2, numpy as np, sys, glob, re
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28d-tools')
from lib import src
d, t = sys.argv[1], float(sys.argv[2])
x0, x1, y0, y1 = (int(v) for v in sys.argv[3:7]) if len(sys.argv) > 6 else (0, 1100, 150, 946)
p = [f for f in glob.glob(d + '/frame-*.png') if abs(float(re.search(r'at-([\d.]+)s', f).group(1)) - t) < 1e-3][0]
def mask(im):
    sm = cv2.bilateralFilter(im, 9, 30, 5); lab = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB).astype(int)
    L, A, B = lab[..., 0] * 100 // 255, lab[..., 1] - 128, lab[..., 2] - 128
    m = ((A < 1) & (L > 30) & (L < 85) & (B < 25)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    return cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
mr, ms = mask(cv2.imread(p)), mask(src(t))
print('rows: y  left_render left_src')
for y in range(y0, y1, 40):
    a = np.where(mr[y, x0:x1])[0]; b = np.where(ms[y, x0:x1])[0]
    print(y, (a[0] + x0) if len(a) else '-', (b[0] + x0) if len(b) else '-')
print('cols: x  top_render top_src')
for x in range(x0, x1, 60):
    a = np.where(mr[y0:y1, x])[0]; b = np.where(ms[y0:y1, x])[0]
    print(x, (a[0] + y0) if len(a) else '-', (b[0] + y0) if len(b) else '-')
