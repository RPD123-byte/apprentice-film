# inkview.py FRAMES x0 y0 x1 y1 scale out.jpg [grid] : the source's ink map (paper - pre-grade, dark = ink) with a grid
import sys, numpy as np, cv2
from common import *
fr = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); sc = float(sys.argv[6]); out = sys.argv[7]; gs = int(sys.argv[8]) if len(sys.argv) > 8 else 10
P = cv2.GaussianBlur(srcpre(fr), (0, 0), 0.8); paper = cv2.GaussianBlur(cv2.dilate(P, np.ones((9, 9), np.uint8)), (0, 0), 2)
mode = sys.argv[9] if len(sys.argv) > 9 else 'ink'
im = (255 - np.clip((paper - P) / 0.5, 0, 1) * 255).astype(np.uint8) if mode == 'ink' else (np.clip(P, 0, 1) * 255).astype(np.uint8)
c = cv2.resize(im[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_LINEAR); c = cv2.cvtColor(c, cv2.COLOR_GRAY2BGR)
for x in range((x0 // gs + 1) * gs, x1, gs):
    X = int((x - x0) * sc); cv2.line(c, (X, 0), (X, c.shape[0]), (200, 220, 255) if x % 50 else (100, 140, 255), 1)
    if x % 50 == 0: cv2.putText(c, str(x), (X + 2, 12), 0, 0.4, (0, 0, 255), 1)
for y in range((y0 // gs + 1) * gs, y1, gs):
    Y = int((y - y0) * sc); cv2.line(c, (0, Y), (c.shape[1], Y), (200, 220, 255) if y % 50 else (100, 140, 255), 1)
    if y % 50 == 0: cv2.putText(c, str(y), (2, Y - 2), 0, 0.4, (0, 0, 255), 1)
cv2.imwrite(out, c)
