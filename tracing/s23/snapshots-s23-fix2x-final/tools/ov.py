#!/usr/bin/env python3
# ov.py render.png k x0 y0 x1 y1 out.jpg [scale] : render | source | overlay (render=magenta, source=green) with a grid every 50 px
import sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s23-fix2x-tools')
from m import src
r = cv2.imread(sys.argv[1]); k = int(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7]); out = sys.argv[7]; sc = float(sys.argv[8]) if len(sys.argv) > 8 else 1
s = src(k)
def crop(im): return cv2.resize(im[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC)
a, b = crop(r), crop(s)
ga, gb = cv2.cvtColor(a, cv2.COLOR_BGR2GRAY), cv2.cvtColor(b, cv2.COLOR_BGR2GRAY)
o = np.dstack([ga, gb, ga])
def grid(c):
    for x in range((x0 // 50 + 1) * 50, x1, 50):
        X = int((x - x0) * sc); cv2.line(c, (X, 0), (X, c.shape[0]), (0, 140, 255), 1); cv2.putText(c, str(x), (X + 2, 12), 0, 0.4, (0, 255, 255), 1)
    for y in range((y0 // 50 + 1) * 50, y1, 50):
        Y = int((y - y0) * sc); cv2.line(c, (0, Y), (c.shape[1], Y), (0, 140, 255), 1); cv2.putText(c, str(y), (2, Y - 3), 0, 0.4, (0, 255, 255), 1)
    return c
ims = [grid(a.copy()), grid(b.copy()), grid(o)]
sep = lambda h: np.full((h, 4, 3), 128, np.uint8)
im = np.hstack([ims[0], sep(a.shape[0]), ims[1], sep(a.shape[0]), ims[2]])
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 88])
