# rows.py FRAMES x0 x1 "y1,y2,..." [thr=0.35] : along each row, the runs of dark (pre-grade < thr) pixels between x0 and x1
# (sigma 1 blur) - reading the outline of dark parts (cushions, bands) at measured rows
import sys, numpy as np, cv2
from common import *
fr = sys.argv[1]; x0, x1 = int(sys.argv[2]), int(sys.argv[3]); ys = [int(v) for v in sys.argv[4].split(',')]; thr = float(sys.argv[5]) if len(sys.argv) > 5 else 0.35
P = cv2.GaussianBlur(srcpre(fr), (0, 0), 1.0)
for y in ys:
    row = P[y, x0:x1] < thr; runs = []; i = 0
    while i < len(row):
        if row[i]:
            j = i
            while j < len(row) and row[j]: j += 1
            if j - i >= 3: runs.append((x0 + i, x0 + j - 1))
            i = j
        else: i += 1
    print(y, runs)
