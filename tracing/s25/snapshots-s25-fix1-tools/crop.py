#!/usr/bin/env python3
# crop.py RDIR F x0 y0 x1 y1 out.jpg [scale]  -> render | source crop side by side (render left)
import cv2, numpy as np, sys
d, f, x0, y0, x1, y1, out = sys.argv[1], int(sys.argv[2]), *map(int, sys.argv[3:7]), sys.argv[7]
sc = float(sys.argv[8]) if len(sys.argv) > 8 else 1.0
r = cv2.imread(f'{d}/r{f:05d}.png')[y0:y1, x0:x1]
s = cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s25-fix1-src/f{f:05d}.png')[y0:y1, x0:x1]
im = np.hstack([r, np.full((r.shape[0], 6, 3), (0, 200, 255), np.uint8), s])
if sc != 1: im = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC)
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 90])
