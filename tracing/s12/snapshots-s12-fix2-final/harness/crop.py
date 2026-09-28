# python crop.py dir t x0 y0 x1 y1 scale out.jpg [grid]  -> render | source crop, zoomed, optional grid every 10 px
import cv2, numpy as np, sys
d, t = sys.argv[1], sys.argv[2]; x0, y0, x1, y1 = map(int, sys.argv[3:7]); s = float(sys.argv[7]); out = sys.argv[8]
grid = len(sys.argv) > 9
F = {'34.0': 850, '35.2': 880, '35.3': 882}[t]
a = cv2.imread(f'{d}/r-{t}.png'); b = cv2.imread(f'src-{F}.png')
def z(im):
  c = im[y0:y1, x0:x1]; c = cv2.resize(c, None, fx=s, fy=s, interpolation=cv2.INTER_NEAREST if s >= 3 else cv2.INTER_CUBIC)
  if grid:
    step = 10 if (x1 - x0) < 200 else 20
    for gx in range((x0 // step + 1) * step, x1, step):
      X = int((gx - x0) * s); cv2.line(c, (X, 0), (X, c.shape[0]), (0, 0, 255) if gx % 50 == 0 else (0, 120, 255), 1)
      if gx % 50 == 0: cv2.putText(c, str(gx), (X + 2, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
    for gy in range((y0 // step + 1) * step, y1, step):
      Y = int((gy - y0) * s); cv2.line(c, (0, Y), (c.shape[1], Y), (0, 0, 255) if gy % 50 == 0 else (0, 120, 255), 1)
      if gy % 50 == 0: cv2.putText(c, str(gy), (2, Y - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
  return c
A, B = z(a), z(b)
cv2.imwrite(out, np.hstack([A, np.full((A.shape[0], 6, 3), (0, 200, 0), np.uint8), B]), [cv2.IMWRITE_JPEG_QUALITY, 92])
