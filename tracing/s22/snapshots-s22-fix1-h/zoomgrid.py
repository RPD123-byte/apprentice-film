# zoomgrid.py IMG x0 y0 x1 y1 scale step out [--label L]: zoom a frame region with a frame-px grid (measuring aid)
import sys, cv2, numpy as np
sys.path.insert(0, '.')
from run import src
a = sys.argv[1:]
im = src(int(a[0][1:])) if a[0].startswith('F') else cv2.imread(a[0])
x0, y0, x1, y1 = [int(v) for v in a[1:5]]; s = int(a[5]); st = int(a[6]); out = a[7]
c = cv2.resize(im[y0:y1, x0:x1], None, fx=s, fy=s, interpolation=cv2.INTER_CUBIC)
for x in range((x0 // st + 1) * st, x1, st):
    X = (x - x0) * s; big = x % (st * 5) == 0
    cv2.line(c, (X, 0), (X, c.shape[0]), (0, 0, 255) if big else (0, 110, 0), 1)
    if big: cv2.putText(c, str(x), (X + 2, 12), 0, 0.4, (0, 255, 255), 1)
for y in range((y0 // st + 1) * st, y1, st):
    Y = (y - y0) * s; big = y % (st * 5) == 0
    cv2.line(c, (0, Y), (c.shape[1], Y), (0, 0, 255) if big else (0, 110, 0), 1)
    if big: cv2.putText(c, str(y), (2, Y - 2), 0, 0.4, (0, 255, 255), 1)
cv2.imwrite(out, c, [cv2.IMWRITE_JPEG_QUALITY, 92]); print(out, c.shape)
