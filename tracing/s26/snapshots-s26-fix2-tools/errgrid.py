#!/usr/bin/env python3
# per-beat sigma-8 dE in a 3x2 grid of the frame (render DIR vs source). Usage: errgrid.py DIR
import cv2, numpy as np, sys, glob, re
d = sys.argv[1]; SRC = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas/src'
B = [("A", 2763, 2788), ("B", 2789, 2789), ("C", 2790, 2817), ("D", 2818, 2842), ("E", 2843, 2853), ("F1", 2854, 2887), ("F2", 2888, 2938)]
lab = lambda im: cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32) / 255, (0, 0), 8), cv2.COLOR_BGR2LAB)
acc = {}
for p in glob.glob(d + '/r*.png'):
    F = int(re.search(r'r(\d+)\.png', p).group(1)); s = cv2.imread(f'{SRC}/{F}.png')
    if s is None: continue
    e = np.sqrt(((lab(cv2.imread(p)) - lab(s)) ** 2).sum(2))
    g = [[e[y * 473:(y + 1) * 473, x * 735:(x + 1) * 735].mean() for x in range(3)] for y in range(2)]
    for n, a, b in B:
        if a <= F <= b: acc.setdefault(n, []).append(g)
for n, a, b in B:
    if n in acc:
        m = np.mean(acc[n], 0); print(f'{n:3s} top {m[0][0]:5.1f} {m[0][1]:5.1f} {m[0][2]:5.1f} | bottom {m[1][0]:5.1f} {m[1][1]:5.1f} {m[1][2]:5.1f}')
