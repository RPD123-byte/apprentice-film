#!/usr/bin/env python3
# boilres.py renderdir f0 f1 - frame-to-frame residual of the shot-A owl head (registered by PATH_A) in the render
# and in the source: mean |F(n+1) - F(n)| inside the head, blurred 1 px (grain mostly removed)
import sys, os, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from common import frame
from owlprev import PATH_A
d = sys.argv[1]; f0, f1 = int(sys.argv[2]), int(sys.argv[3])
# head box at the 1356 placement (frame px)
X0, Y0, X1, Y1 = 470, 170, 760, 420
def reg(img, n):
    dx, dy = PATH_A[n]; return img[Y0 + dy:Y1 + dy, X0 + dx:X1 + dx].astype(np.float32)
b = lambda a: cv2.GaussianBlur(a, (0, 0), 1.0)
for n in range(f0, f1):
    if not (os.path.exists(f'{d}/r{n}.png') and os.path.exists(f'{d}/r{n + 1}.png')): continue
    Ra, Rb = reg(cv2.imread(f'{d}/r{n}.png', 0), n), reg(cv2.imread(f'{d}/r{n + 1}.png', 0), n + 1)
    Sa, Sb = reg(frame(n), n), reg(frame(n + 1), n + 1)
    print(n, f'render {np.abs(b(Ra) - b(Rb)).mean():.2f}  source {np.abs(b(Sa) - b(Sb)).mean():.2f}')
