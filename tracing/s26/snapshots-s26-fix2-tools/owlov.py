#!/usr/bin/env python3
# overlay the outline of our owl-only renders (DIR/rF.png, raw) on source frames + render|source crops.
# Usage: owlov.py DIR out.jpg x0 y0 x1 y1 scale F...
import cv2, sys, numpy as np
d, out = sys.argv[1], sys.argv[2]; x0, y0, x1, y1 = map(int, sys.argv[3:7]); sc = float(sys.argv[7]); Fs = list(map(int, sys.argv[8:]))
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas/src'
rows = []
for F in Fs:
    r = cv2.imread(f'{d}/r{F}.png'); s = cv2.imread(f'{SRC}/{F}.png')
    m = (r.max(2) > 30).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    e = cv2.dilate(cv2.Canny(m * 255, 50, 150), np.ones((2, 2), np.uint8))
    ms = np.fromfile(f'/Users/computer/rootline/apprentice-film/snapshots/s26b-meas/fit/m/{F}.bin', np.uint8).reshape(473, 1103)
    ms = cv2.resize(ms, (2206, 946)); es = cv2.dilate(cv2.Canny(ms, 100, 200), np.ones((2, 2), np.uint8))
    a = s.copy(); a[e > 0] = (0, 0, 255); a[es > 0] = (0, 255, 0)
    b = r.copy(); b[es > 0] = (0, 255, 0)
    for im in (a, b):
        for x in range(0, 2206, 50): cv2.line(im, (x, 0), (x, 946), (60, 60, 60) if x % 100 else (90, 90, 160), 1)
        for y in range(0, 946, 50): cv2.line(im, (0, y), (2206, y), (60, 60, 60) if y % 100 else (90, 90, 160), 1)
    c = lambda im: cv2.resize(im[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
    t = np.hstack([c(b), c(a)]); cv2.putText(t, str(F), (10, 30), 0, 0.9, (0, 255, 255), 2)
    for x in range((x0 // 100 + 1) * 100, x1, 100): cv2.putText(t, str(x), (int((x - x0) * sc) + 2, 50), 0, 0.45, (0, 255, 255), 1)
    for y in range((y0 // 100 + 1) * 100, y1, 100): cv2.putText(t, str(y), (2, int((y - y0) * sc) - 2), 0, 0.45, (0, 255, 255), 1)
    rows.append(t)
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 85])
