# usage: crop.py DIR IDX x0 y0 x1 y1 out.jpg [scale]  -> render crop | source crop stacked horizontally
import cv2, sys, glob, numpy as np
d, idx = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = map(int, sys.argv[3:7]); out = sys.argv[7]; sc = float(sys.argv[8]) if len(sys.argv) > 8 else 1.0
f = cv2.imread(glob.glob(f"{d}/frame-{idx}-*.png")[0]); r = cv2.imread(glob.glob(f"{d}/ref-{idx}-*.png")[0])
if r.shape != f.shape: r = cv2.resize(r, (f.shape[1], f.shape[0]))
a = f[y0:y1, x0:x1]; b = r[y0:y1, x0:x1]
sep = np.full((a.shape[0], 6, 3), (0, 0, 255), np.uint8)
im = np.hstack([a, sep, b])
if sc != 1: im = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_NEAREST if sc > 1 else cv2.INTER_AREA)
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 92])
