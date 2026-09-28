#!/usr/bin/env python3
# vcrop.py DIR IDX x0 y0 x1 y1 zoom out : render (top) above source (bottom), with a red separator line
import cv2, sys, glob, numpy as np
d, idx = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = [int(v) for v in sys.argv[3:7]]; z = float(sys.argv[7]); out = sys.argv[8]
fr = cv2.imread(sorted(glob.glob(f'{d}/frame-{idx}-*.png'))[0]); rf = cv2.imread(sorted(glob.glob(f'{d}/ref-{idx}-*.png'))[0])
a = fr[y0:y1, x0:x1]; b = rf[y0:y1, x0:x1]
rs = lambda p: cv2.resize(p, None, fx=z, fy=z, interpolation=cv2.INTER_AREA if z < 1 else cv2.INTER_CUBIC)
sep = np.zeros((3, int((x1 - x0) * z), 3), np.uint8); sep[:, :, 2] = 255
A, B = rs(a), rs(b); sep = cv2.resize(sep, (A.shape[1], 3))
cv2.imwrite(out, np.vstack([A, sep, B]), [cv2.IMWRITE_JPEG_QUALITY, 90])
