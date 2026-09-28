#!/usr/bin/env python3
# ov.py render.png k x0 y0 x1 y1 out.jpg [scale]  -> render crop | source crop | overlay (render silhouette contour in red on source)
import sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s23r-tools')
from m import src
r = cv2.imread(sys.argv[1]); k = int(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7]); out = sys.argv[7]; sc = float(sys.argv[8]) if len(sys.argv) > 8 else 2
s = src(k)
a = r[y0:y1, x0:x1]; b = s[y0:y1, x0:x1]
m = (cv2.cvtColor(a, cv2.COLOR_BGR2GRAY) > 40).astype(np.uint8)
cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
o = b.copy(); cv2.drawContours(o, cs, -1, (0, 0, 255), 1)
im = np.hstack([a, b, o]); im = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 90])
