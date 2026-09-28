#!/usr/bin/env python3
# cp.py render.png k x0 y0 x1 y1 out.jpg [scale] : render crop | source crop with ticks (source frame k)
import sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s23r-tools')
from m import src
r = cv2.imread(sys.argv[1]); k = int(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7]); out = sys.argv[7]; sc = float(sys.argv[8]) if len(sys.argv) > 8 else 1
def tick(im):
    c = cv2.resize(im[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC)
    st = 20 if (x1 - x0) < 400 else 50 if (x1-x0) < 1000 else 100
    for x in range((x0 // st + 1) * st, x1, st):
        X = int((x - x0) * sc); cv2.line(c, (X, 0), (X, 6), (0, 200, 255), 1); cv2.putText(c, str(x), (X + 2, 14), 0, 0.4, (0, 255, 255), 1)
    for y in range((y0 // st + 1) * st, y1, st):
        Y = int((y - y0) * sc); cv2.line(c, (0, Y), (6, Y), (0, 200, 255), 1); cv2.putText(c, str(y), (2, Y - 3), 0, 0.4, (0, 255, 255), 1)
    return c
a = tick(r); b = tick(src(k))
if (x1-x0) > (y1-y0)*1.3: im = np.vstack([a, np.full((4, a.shape[1], 3), 128, np.uint8), b])
else: im = np.hstack([a, np.full((a.shape[0], 4, 3), 128, np.uint8), b])
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 88])
