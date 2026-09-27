#!/usr/bin/env python3
# zgrid.py IMG|T x0 y0 x1 y1 out.jpg [scale] [--poly json]: zoomed crop with a 10 px grid (labels every 50)
import cv2, sys, json, numpy as np
a = sys.argv[1]
x0, y0, x1, y1 = [int(v) for v in sys.argv[2:6]]; out = sys.argv[6]; sc = float(sys.argv[7]) if len(sys.argv) > 7 and not sys.argv[7].startswith('--') else 4
if a.endswith('.png') or a.endswith('.jpg'): im = cv2.imread(a)
else:
    t = float(a); i = int(round((t - 26.72) * 25)) + 1
    im = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s06-r2-src/f%03d.png' % i)
c = cv2.resize(im[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
for x in range((x0 // 10 + 1) * 10, x1, 10):
    X = int((x - x0) * sc); col = (0, 0, 255) if x % 50 == 0 else (0, 140, 255)
    cv2.line(c, (X, 0), (X, c.shape[0]), col, 1 if x % 50 == 0 else 1, cv2.LINE_4) if x % 50 == 0 else [cv2.line(c, (X, yy), (X, yy + 2), col, 1) for yy in range(0, c.shape[0], 8)]
    if x % 50 == 0: cv2.putText(c, str(x), (X + 2, 12), 0, 0.4, (0, 255, 255), 1)
for y in range((y0 // 10 + 1) * 10, y1, 10):
    Y = int((y - y0) * sc); col = (0, 0, 255) if y % 50 == 0 else (0, 140, 255)
    cv2.line(c, (0, Y), (c.shape[1], Y), col, 1) if y % 50 == 0 else [cv2.line(c, (xx, Y), (xx + 2, Y), col, 1) for xx in range(0, c.shape[1], 8)]
    if y % 50 == 0: cv2.putText(c, str(y), (2, Y - 2), 0, 0.4, (0, 255, 255), 1)
if '--poly' in sys.argv:
    P = json.loads(sys.argv[sys.argv.index('--poly') + 1])
    for k, L in enumerate(P):
        L = np.array(L, float); pts = ((L - [x0, y0]) * sc).astype(np.int32)
        cv2.polylines(c, [pts], False, [(0, 255, 0), (255, 0, 255), (255, 255, 0), (0, 255, 255)][k % 4], 1, cv2.LINE_AA)
cv2.imwrite(out, c, [cv2.IMWRITE_JPEG_QUALITY, 92])
