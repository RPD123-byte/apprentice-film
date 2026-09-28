#!/usr/bin/env python3
# emap.py DIR out.jpg k1 k2 ...: signed blurred error maps (render - source, sigma 8): red = render brighter, blue = darker
import sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s23r-tools')
from m import src
d, out = sys.argv[1], sys.argv[2]; rows = []
for k in map(int, sys.argv[3:]):
    a = cv2.imread(f'{d}/r{k:05d}.png'); b = src(k)
    ga = cv2.GaussianBlur(cv2.cvtColor(a, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 8)
    gb = cv2.GaussianBlur(cv2.cvtColor(b, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 8)
    e = ga - gb
    im = np.zeros(a.shape, np.uint8); im[..., 2] = np.clip(e * 3, 0, 255); im[..., 0] = np.clip(-e * 3, 0, 255); im[..., 1] = (gb * 0.25).astype(np.uint8)
    im = cv2.resize(im, None, fx=0.45, fy=0.45); cv2.putText(im, f'{k/25:.2f} MAE {np.abs(e).mean():.1f}', (6, 18), 0, 0.55, (255, 255, 255), 1); rows.append(im)
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 85])
# region breakdown for the last one
