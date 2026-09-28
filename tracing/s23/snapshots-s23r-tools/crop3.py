#!/usr/bin/env python3
# crop3.py k x0 y0 x1 y1 out.jpg [scale]: source crop with frame-px tick labels every 20 px
import sys, cv2
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s23r-tools')
from m import src
k = int(sys.argv[1]); x0, y0, x1, y1 = map(int, sys.argv[2:6]); out = sys.argv[6]; sc = float(sys.argv[7]) if len(sys.argv) > 7 else 3
c = cv2.resize(src(k)[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
st = 20 if (x1 - x0) < 500 else 50
for x in range((x0 // st + 1) * st, x1, st):
    X = int((x - x0) * sc); cv2.line(c, (X, 0), (X, c.shape[0]), (0, 200, 255) if x % 100 else (0, 0, 255), 1); cv2.putText(c, str(x), (X + 2, 14), 0, 0.42, (0, 255, 255), 1)
for y in range((y0 // st + 1) * st, y1, st):
    Y = int((y - y0) * sc); cv2.line(c, (0, Y), (c.shape[1], Y), (0, 200, 255) if y % 100 else (0, 0, 255), 1); cv2.putText(c, str(y), (2, Y - 3), 0, 0.42, (0, 255, 255), 1)
cv2.putText(c, '%.2f' % (k / 25), (c.shape[1] - 60, c.shape[0] - 8), 0, 0.5, (0, 255, 0), 1)
cv2.imwrite(out, c, [cv2.IMWRITE_JPEG_QUALITY, 90])
