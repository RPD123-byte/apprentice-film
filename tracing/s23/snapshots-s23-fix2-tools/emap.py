#!/usr/bin/env python3
# emap.py render.png k x0 y0 x1 y1 out.jpg [scale]: blurred(σ8) render | blurred source | signed error (red = render brighter, blue = darker)
import sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s23r-tools')
from m import src
r = cv2.imread(sys.argv[1]); k = int(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7]); out = sys.argv[7]; sc = float(sys.argv[8]) if len(sys.argv) > 8 else 1
bl = lambda im: cv2.GaussianBlur(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 8)
a, b = bl(r)[y0:y1, x0:x1], bl(src(k))[y0:y1, x0:x1]
d = a - b
e = np.zeros(a.shape + (3,), np.uint8); e[..., 2] = np.clip(d * 3, 0, 255); e[..., 0] = np.clip(-d * 3, 0, 255)
g = lambda x: cv2.cvtColor(np.clip(x, 0, 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
ims = [g(a), g(b), e]
ims = [cv2.resize(i, None, fx=sc, fy=sc) for i in ims]
for c in ims:
    for x in range((x0 // 50 + 1) * 50, x1, 50):
        X = int((x - x0) * sc); cv2.line(c, (X, 0), (X, c.shape[0]), (0, 140, 255), 1); cv2.putText(c, str(x), (X + 2, 12), 0, 0.4, (0, 255, 255), 1)
    for y in range((y0 // 50 + 1) * 50, y1, 50):
        Y = int((y - y0) * sc); cv2.line(c, (0, Y), (c.shape[1], Y), (0, 140, 255), 1); cv2.putText(c, str(y), (2, Y - 3), 0, 0.4, (0, 255, 255), 1)
sep = np.full((ims[0].shape[0], 4, 3), 128, np.uint8)
cv2.imwrite(out, np.hstack([ims[0], sep, ims[1], sep, ims[2]]), [cv2.IMWRITE_JPEG_QUALITY, 88])
