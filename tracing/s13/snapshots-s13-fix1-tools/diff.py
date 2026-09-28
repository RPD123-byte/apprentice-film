# diff.py RENDERDIR FRAME x0,y0,x1,y1 scale out.jpg [sigma] : signed blurred difference (render - source), red = render
# brighter, blue = render darker (+-40 levels full scale), over a faint copy of the source
import sys, numpy as np, cv2
from common import *
d, f = sys.argv[1], int(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3].split(',')); sc = float(sys.argv[4]); out = sys.argv[5]
sg = float(sys.argv[6]) if len(sys.argv) > 6 else 3
R = cv2.imread(f'{d}/r{f}.png', 0).astype(np.float32); S = src(f)
D = cv2.GaussianBlur(R, (0, 0), sg) - cv2.GaussianBlur(S, (0, 0), sg)
D = D[y0:y1, x0:x1]; base = S[y0:y1, x0:x1] * 0.12
img = np.stack([base + np.clip(-D, 0, 25) / 25 * 255, base + 0 * D, base + np.clip(D, 0, 25) / 25 * 255], -1)
img = cv2.resize(np.clip(img, 0, 255).astype(np.uint8), None, fx=sc, fy=sc)
for x in range((x0 // 50 + 1) * 50, x1, 50): X = int((x - x0) * sc); cv2.putText(img, str(x), (X, 12), 0, 0.4, (0, 255, 255), 1); cv2.line(img, (X, 0), (X, 5), (0, 255, 255), 1)
for y in range((y0 // 50 + 1) * 50, y1, 50): Y = int((y - y0) * sc); cv2.putText(img, str(y), (2, Y), 0, 0.4, (0, 255, 255), 1); cv2.line(img, (0, Y), (5, Y), (0, 255, 255), 1)
cv2.imwrite(out, img)
