# crop.py RENDER.png N x0 y0 x1 y1 out.jpg [scale] [v] : render | source crop (v = stacked vertically)
import sys, cv2, numpy as np
a = cv2.imread(sys.argv[1]); n = int(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7])
b = cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s07-bt/src/n{n:04d}.png')
s = float(sys.argv[8]) if len(sys.argv) > 8 else 1.0
A = a[y0:y1, x0:x1]; B = b[y0:y1, x0:x1]
if s != 1: A = cv2.resize(A, None, fx=s, fy=s, interpolation=cv2.INTER_CUBIC if s > 1 else cv2.INTER_AREA); B = cv2.resize(B, None, fx=s, fy=s, interpolation=cv2.INTER_CUBIC if s > 1 else cv2.INTER_AREA)
v = len(sys.argv) > 9 and sys.argv[9] == 'v'
cv2.imwrite(sys.argv[7], np.vstack([A, B]) if v else np.hstack([A, B]), [cv2.IMWRITE_JPEG_QUALITY, 92])
