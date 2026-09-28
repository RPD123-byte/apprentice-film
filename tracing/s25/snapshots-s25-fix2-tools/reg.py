#!/usr/bin/env python3
# reg.py RDIR F "x0 y0 x1 y1" ["x0 y0 x1 y1" ...] -> mean RGB (and gray std) render vs source per box
import cv2, numpy as np, sys
d, f = sys.argv[1], int(sys.argv[2])
r = cv2.imread(f'{d}/r{f:05d}.png'); s = cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s25-fix1-src/f{f:05d}.png')
for b in sys.argv[3:]:
    x0, y0, x1, y1 = map(int, b.split())
    R = r[y0:y1, x0:x1].reshape(-1, 3).astype(float); S = s[y0:y1, x0:x1].reshape(-1, 3).astype(float)
    rm, sm = R.mean(0)[::-1], S.mean(0)[::-1]
    rg = cv2.cvtColor(r[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY).astype(float); sg = cv2.cvtColor(s[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY).astype(float)
    print(f'{f} [{b}] render ({rm[0]:.0f},{rm[1]:.0f},{rm[2]:.0f}) src ({sm[0]:.0f},{sm[1]:.0f},{sm[2]:.0f}) dgray {rg.mean()-sg.mean():+.1f} std {rg.std():.0f}/{sg.std():.0f}')
