#!/usr/bin/env python3
# Print pre-grade colours (median of a small window) at given points: sample.py img x,y[,r] x,y[,r] ...
import cv2, sys, numpy as np
im = cv2.imread(sys.argv[1])
for s in sys.argv[2:]:
    p = [float(v) for v in s.split(',')]
    x, y = int(p[0]), int(p[1]); r = int(p[2]) if len(p) > 2 else 3
    w = im[max(0, y - r):y + r + 1, max(0, x - r):x + r + 1].reshape(-1, 3)
    b, g, rr = np.median(w, axis=0).astype(int)
    print(f"{x},{y}: #{rr:02x}{g:02x}{b:02x}  ({rr},{g},{b})")
