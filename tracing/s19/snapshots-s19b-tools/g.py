#!/usr/bin/env python3
# grid crop with labels inside the crop: g.py T x0 y0 x1 y1 step scale out.jpg
import cv2, sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
from lab import src
t = float(sys.argv[1]); x0, y0, x1, y1, step = [int(v) for v in sys.argv[2:7]]; sc = float(sys.argv[7]); out = sys.argv[8]
f = src(t)[y0:y1, x0:x1].copy()
f = cv2.resize(f, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
for x in range((x0 // step + 1) * step, x1, step):
    X = int((x - x0) * sc); cv2.line(f, (X, 0), (X, f.shape[0]), (0, 0, 255) if x % (step * 5) == 0 else (0, 200, 255), 1)
    cv2.putText(f, str(x), (X + 2, 12), 0, 0.4, (0, 255, 255), 1)
for y in range((y0 // step + 1) * step, y1, step):
    Y = int((y - y0) * sc); cv2.line(f, (0, Y), (f.shape[1], Y), (0, 0, 255) if y % (step * 5) == 0 else (0, 200, 255), 1)
    cv2.putText(f, str(y), (2, Y - 3), 0, 0.4, (0, 255, 255), 1)
cv2.imwrite(out, f, [cv2.IMWRITE_JPEG_QUALITY, 90])
