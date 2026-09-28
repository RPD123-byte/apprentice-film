# ovrs.py RENDERDIR FRAME x0,y0,x1,y1 scale out.jpg : colour overlay, source in blue, render in orange (equal = grey)
import sys, numpy as np, cv2
from common import *
d, f = sys.argv[1], int(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3].split(',')); sc = float(sys.argv[4])
R = cv2.imread(f'{d}/r{f}.png', 0).astype(np.float32)[y0:y1, x0:x1]; S = src(f)[y0:y1, x0:x1]
im = np.stack([S, (R + S) / 2, R], -1)
im = cv2.resize(np.clip(im, 0, 255).astype(np.uint8), None, fx=sc, fy=sc)
for x in range((x0 // 50 + 1) * 50, x1, 50): X = int((x - x0) * sc); cv2.putText(im, str(x), (X, 12), 0, 0.4, (0, 255, 0), 1); cv2.line(im, (X, 0), (X, 6), (0, 255, 0), 1)
for y in range((y0 // 50 + 1) * 50, y1, 50): Y = int((y - y0) * sc); cv2.putText(im, str(y), (2, Y), 0, 0.4, (0, 255, 0), 1); cv2.line(im, (0, Y), (6, Y), (0, 255, 0), 1)
cv2.imwrite(sys.argv[5], im)
