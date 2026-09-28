#!/usr/bin/env python3
# side by side: raw owl render (black bg) | source crop; plus an outline overlay. Usage: ov.py DIR F x0 y0 x1 y1
import cv2, numpy as np, sys
d, F = sys.argv[1], int(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7])
r = cv2.imread(f'{d}/r{F}.png'); s = cv2.imread(f'snapshots/s26c-meas/src/{F}.png')
m = (r.max(2) > 12).astype(np.uint8)
cnt, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
ov = s.copy(); cv2.drawContours(ov, cnt, -1, (0, 0, 255), 2)
mk = np.fromfile(f'snapshots/s26b-meas/fit/m/{F}.bin', np.uint8).reshape(473, 1103) if F <= 2847 else None
if mk is not None:
    M = cv2.resize(mk, (2206, 946)); c2, _ = cv2.findContours((M > 127).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(ov, c2, -1, (0, 255, 0), 1)
im = np.hstack([r[y0:y1, x0:x1], ov[y0:y1, x0:x1]])
sc = min(1.0, 1800 / im.shape[1]); im = cv2.resize(im, None, fx=sc, fy=sc)
cv2.imwrite(f'{d}/ov{F}.jpg', im, [cv2.IMWRITE_JPEG_QUALITY, 88])
