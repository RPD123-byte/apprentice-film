# edge overlay: red = source edges, green = render edges. edgeov.py RDIR OUT F x0 y0 x1 y1 [sc]
import cv2, numpy as np, sys
rd, OUT, F = sys.argv[1], sys.argv[2], int(sys.argv[3]); x0, y0, x1, y1 = map(int, sys.argv[4:8]); sc = float(sys.argv[8]) if len(sys.argv) > 8 else 1
e = lambda p: cv2.Canny(cv2.GaussianBlur(cv2.cvtColor(cv2.imread(p), cv2.COLOR_BGR2GRAY), (0, 0), 1.5), 25, 70)
es, er = e(f'src/s{F}.png'), e(f'{rd}/r{F}.png')
ov = np.zeros(es.shape + (3,), np.uint8); ov[..., 2] = es; ov[..., 1] = er
ov = ov[y0:y1, x0:x1]
for x in range((x0 // 50 + 1) * 50, x1, 50): cv2.line(ov, (x - x0, 0), (x - x0, y1 - y0), (90, 60, 0), 1)
for y in range((y0 // 50 + 1) * 50, y1, 50): cv2.line(ov, (0, y - y0), (x1 - x0, y - y0), (90, 60, 0), 1)
ov = cv2.resize(ov, None, fx=sc, fy=sc, interpolation=cv2.INTER_NEAREST)
cv2.putText(ov, f'{F/25:.2f} red=src green=render grid50 from {x0},{y0}', (5, 15), 0, 0.45, (255, 255, 255), 1)
cv2.imwrite(OUT, ov)
