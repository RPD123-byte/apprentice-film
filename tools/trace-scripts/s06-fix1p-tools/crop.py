#!/usr/bin/env python3
# crop.py DIR IDX x0 y0 x1 y1 out.jpg [scale] : render | source crop side by side (from compare.sh output), grid every 50 px
# or: crop.py SRC T x0 y0 x1 y1 out.jpg [scale]  (source only, from snapshots/s06-r2-src/fNNN.png, T in s)
import cv2, sys, glob, numpy as np
d, idx = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = [int(v) for v in sys.argv[3:7]]
out = sys.argv[7]; sc = float(sys.argv[8]) if len(sys.argv) > 8 else 2
def grid(im):
    im = cv2.cvtColor(im, cv2.COLOR_GRAY2BGR) if im.ndim == 2 else im
    im = cv2.resize(im[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC if sc > 1 else cv2.INTER_AREA)
    step = 50 if (x1 - x0) < 900 else 100
    for x in range((x0 // step + 1) * step, x1, step):
        X = int((x - x0) * sc); cv2.line(im, (X, 0), (X, 6), (0, 200, 255), 1); cv2.putText(im, str(x), (X + 2, 16), 0, 0.4, (0, 220, 255), 1)
    for y in range((y0 // step + 1) * step, y1, step):
        Y = int((y - y0) * sc); cv2.line(im, (0, Y), (6, Y), (0, 200, 255), 1); cv2.putText(im, str(y), (8, Y + 4), 0, 0.4, (0, 220, 255), 1)
    return im
if d == 'SRC':
    t = float(idx); i = int(round((t - 26.72) * 25)) + 1
    im = cv2.imread('snapshots/s06-r2-src/f%03d.png' % i)
    cv2.imwrite(out, grid(im), [cv2.IMWRITE_JPEG_QUALITY, 92]); sys.exit()
fr = cv2.imread(sorted(glob.glob(f'{d}/frame-{idx}-*.png'))[0])
rf = cv2.imread(sorted(glob.glob(f'{d}/ref-{idx}-*.png'))[0])
a, b = grid(fr), grid(rf)
sep = np.zeros((a.shape[0], 4, 3), np.uint8); sep[..., 2] = 255
cv2.imwrite(out, np.hstack([a, sep, b]), [cv2.IMWRITE_JPEG_QUALITY, 92])
