#!/usr/bin/env python3
# dE8 per region grid (3 cols x 2 rows) for renders in dirs vs source. Usage: regions.py F dir1 dir2 ...
import cv2, numpy as np, sys
F = int(sys.argv[1]); dirs = sys.argv[2:]
def lab(im): return cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32) / 255.0, (0, 0), 8), cv2.COLOR_BGR2LAB)
s = lab(cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s26c-meas/src/{F}.png'))
for d in dirs:
    r = lab(cv2.imread(f'{d}/r{F}.png')); e = np.sqrt(((r - s) ** 2).sum(2))
    H, W = e.shape
    row = []
    for j in range(2):
        for i in range(3):
            row.append(e[j * H // 2:(j + 1) * H // 2, i * W // 3:(i + 1) * W // 3].mean())
    print(f'{d:40s} all {e.mean():5.2f} | top ' + ' '.join(f'{v:5.2f}' for v in row[:3]) + ' | bot ' + ' '.join(f'{v:5.2f}' for v in row[3:]))
