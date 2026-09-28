#!/usr/bin/env python3
# motion.py DIR [F0 F1]: frame-to-frame change (mean abs diff of sigma-1.5 blurred frames) of the render vs the source;
# prints frames where the ratio is off (render/source < 0.6 or > 1.5, or excess > 2)
import cv2, numpy as np, sys
d = sys.argv[1]; F0, F1 = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (2763, 2937)
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas/src/'
def L(p): return cv2.GaussianBlur(cv2.imread(p).astype(np.float32), (0, 0), 1.5)
pr = ps = None; rows = []
for F in range(F0 - 1, F1 + 1):
    r = L(f'{d}/r{F}.png'); s = L(f'{SRC}{F}.png')
    if pr is not None:
        a, b = float(np.abs(r - pr).mean()), float(np.abs(s - ps).mean()); rows.append((F, a, b))
    pr, ps = r, s
for F, a, b in rows:
    flag = '' if (0.6 <= (a + 0.5) / (b + 0.5) <= 1.5 or abs(a - b) < 2) else '  <--'
    if flag or '--all' in sys.argv: print(f'F{F} render {a:6.2f} source {b:6.2f}{flag}')
print('mean |render-source| change', np.mean([abs(a - b) for _, a, b in rows]).round(2), 'n', len(rows))
