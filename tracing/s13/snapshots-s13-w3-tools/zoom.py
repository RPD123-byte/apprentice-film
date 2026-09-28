# zoom.py IMG|f<frame>|med<f0>-<f1> x0 y0 x1 y1 scale out.jpg [grid=10] : magnified crop with a frame-pixel grid
import cv2, numpy as np, sys
a = sys.argv[1]; S = '/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src'
if a.startswith('med'):
    f0, f1 = map(int, a[3:].split('-')); im = np.median(np.stack([cv2.imread(f'{S}/f{f}.png', 0) for f in range(f0, f1 + 1)]), 0).astype(np.uint8)
elif a.startswith('f') and a[1:].isdigit(): im = cv2.imread(f'{S}/f{a[1:]}.png', 0)
else: im = cv2.imread(a, 0)
x0, y0, x1, y1, sc = map(int, sys.argv[2:7]); out = sys.argv[7]; gs = int(sys.argv[8]) if len(sys.argv) > 8 else 10
c = cv2.resize(im[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_NEAREST); c = cv2.cvtColor(c, cv2.COLOR_GRAY2BGR)
for x in range((x0 // gs + 1) * gs, x1, gs):
    X = (x - x0) * sc; cv2.line(c, (X, 0), (X, c.shape[0]), (0, 160, 255) if x % 50 else (0, 0, 255), 1); cv2.putText(c, str(x), (X + 2, 12), 0, 0.38, (0, 255, 255), 1)
for y in range((y0 // gs + 1) * gs, y1, gs):
    Y = (y - y0) * sc; cv2.line(c, (0, Y), (c.shape[1], Y), (0, 160, 255) if y % 50 else (0, 0, 255), 1); cv2.putText(c, str(y), (2, Y - 2), 0, 0.38, (0, 255, 255), 1)
cv2.imwrite(out, c, [cv2.IMWRITE_JPEG_QUALITY, 92]); print(out)
