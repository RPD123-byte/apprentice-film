#!/usr/bin/env python3
# gridded crops (labels = frame px, every 50 px) of render (DIR/rF.png) | source for several frames, stacked.
# Usage: gridpair.py DIR out.jpg x0 y0 x1 y1 scale F1 F2 ...   (DIR '-' = source only)
import cv2, sys, numpy as np
d, out = sys.argv[1], sys.argv[2]; x0, y0, x1, y1 = map(int, sys.argv[3:7]); sc = float(sys.argv[7]); Fs = list(map(int, sys.argv[8:]))
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas/src'
def grid(im, F, tag):
    im = im.copy()
    for x in range(0, im.shape[1], 50): cv2.line(im, (x, 0), (x, im.shape[0]), (0, 200, 255) if x % 100 else (0, 0, 255), 1)
    for y in range(0, im.shape[0], 50): cv2.line(im, (0, y), (im.shape[1], y), (0, 200, 255) if y % 100 else (0, 0, 255), 1)
    c = cv2.resize(im[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
    for x in range((x0 // 50 + 1) * 50, x1, 50): cv2.putText(c, str(x), (int((x - x0) * sc) + 2, 12), 0, 0.4, (0, 255, 255), 1)
    for y in range((y0 // 50 + 1) * 50, y1, 50): cv2.putText(c, str(y), (2, int((y - y0) * sc) - 2), 0, 0.4, (0, 255, 255), 1)
    cv2.putText(c, f'{tag} {F}', (40, 30), 0, 0.7, (0, 255, 0), 2)
    return c
rows = []
for F in Fs:
    s = grid(cv2.imread(f'{SRC}/{F}.png'), F, 'src')
    if d != '-':
        r = cv2.imread(f'{d}/r{F}.png')
        rows.append(np.hstack([grid(r, F, 'ren'), np.zeros((s.shape[0], 6, 3), np.uint8) + (0, 0, 255), s]))
    else: rows.append(s)
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 88])
