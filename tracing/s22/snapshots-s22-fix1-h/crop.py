# crop.py DIR F x0 y0 x1 y1 [scale] [out]: render | source crop side by side (or stacked if wide)
import sys, cv2, numpy as np
sys.path.insert(0, '.')
from run import src
d, F = sys.argv[1], int(sys.argv[2]); x0, y0, x1, y1 = [int(v) for v in sys.argv[3:7]]
s = float(sys.argv[7]) if len(sys.argv) > 7 else 2
out = sys.argv[8] if len(sys.argv) > 8 else f'{d}/crop{F}_{x0}_{y0}.jpg'
A = cv2.imread(f'{d}/r{F:04d}.png')[y0:y1, x0:x1]; B = src(F)[y0:y1, x0:x1]
im = np.hstack([A, np.full((A.shape[0], 4, 3), (0, 0, 200), np.uint8), B]) if (x1 - x0) < (y1 - y0) * 1.6 else np.vstack([A, np.full((4, A.shape[1], 3), (0, 0, 200), np.uint8), B])
cv2.imwrite(out, cv2.resize(im, None, fx=s, fy=s, interpolation=cv2.INTER_CUBIC if s > 1 else cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 90]); print(out)
