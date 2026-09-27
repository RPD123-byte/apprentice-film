#!/usr/bin/env python3
# strokecmp.py DIR IDX strokes.json [x0 y0 x1 y1]: compare render vs source sampled along traced stroke centre-lines
import cv2, sys, glob, json, numpy as np
d, idx, sj = sys.argv[1:4]
box = [int(v) for v in sys.argv[4:8]] if len(sys.argv) > 7 else None
r = cv2.imread(sorted(glob.glob(f'{d}/frame-{idx}-*.png'))[0], 0).astype(float)
s = cv2.imread(sorted(glob.glob(f'{d}/ref-{idx}-*.png'))[0], 0).astype(float)
S = json.load(open(sj))
res = []
for sig in (0, 2, 5):
    rb = cv2.GaussianBlur(r, (0, 0), sig) if sig else r; sb = cv2.GaussianBlur(s, (0, 0), sig) if sig else s
    a = []; b = []
    for st in S:
        for p in st:
            x, y = int(round(p[0])), int(round(p[1]))
            if box and not (box[0] <= x < box[2] and box[1] <= y < box[3]): continue
            if sig == 0:
                a.append(rb[y - 1:y + 2, x - 1:x + 2].min()); b.append(sb[y - 1:y + 2, x - 1:x + 2].min())
            else:
                a.append(rb[y, x]); b.append(sb[y, x])
    a = np.array(a); b = np.array(b)
    print(f'sigma {sig}: render {a.mean():6.1f}  source {b.mean():6.1f}  diff {np.mean(a-b):+6.1f}  mad {np.mean(np.abs(a-b)):5.1f}  n={len(a)}')
