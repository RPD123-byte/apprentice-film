# crop compare: python3 cr.py DIR FRAME x0 y0 x1 y1 [scale] [out]  -> render | source stacked vertically if wide
import cv2, sys, numpy as np
d, f = sys.argv[1], int(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7])
sc = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0
out = sys.argv[8] if len(sys.argv) > 8 else f'{d}/c{f}_{x0}_{y0}.jpg'
r = cv2.imread(f'{d}/r{f:04d}.png'); s = cv2.imread(f'../s02-fix1h-src/{f:04d}.png')
a = r[y0:y1, x0:x1]; b = s[y0:y1, x0:x1]
if sc != 1: a = cv2.resize(a, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC); b = cv2.resize(b, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
w = a.shape[1]; h = a.shape[0]
im = np.vstack([a, np.full((6, w, 3), 128, np.uint8), b]) if w > 1.3 * h else np.hstack([a, np.full((h, 6, 3), 128, np.uint8), b])
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 90]); print(out)
