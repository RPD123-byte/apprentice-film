#!/usr/bin/env python3
# reg.py DIR k1,k2 "x0 y0 x1 y1" ["x0 y0 x1 y1" ...]  -> mean luminance render vs source per box
import sys, cv2, numpy as np, os
SRC = os.path.dirname(os.path.abspath(__file__)) + '/src/%05d.png'
d = sys.argv[1]; ks = [int(k) for k in sys.argv[2].split(',')]
boxes = [list(map(int, b.split())) for b in sys.argv[3:]]
for k in ks:
    r = cv2.imread(d + '/r%05d.png' % k, 0); s = cv2.imread(SRC % k, 0)
    if r is None: continue
    row = ['k=%d %.2f' % (k, k / 25)]
    for x0, y0, x1, y1 in boxes:
        row.append('[%d %d %d %d] R%.0f S%.0f' % (x0, y0, x1, y1, r[y0:y1, x0:x1].mean(), s[y0:y1, x0:x1].mean()))
    print('  '.join(row))
