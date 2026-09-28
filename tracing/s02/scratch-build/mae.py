#!/usr/bin/env python3
# blurred MAE between frame-*.png and ref-*.png in a compare dir; optional region x0 y0 x1 y1
import cv2, glob, re, sys, numpy as np
d = sys.argv[1]
roi = [int(v) for v in sys.argv[2:6]] if len(sys.argv) >= 6 else None
fs = sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
tot = []
for f in fs:
    r = f.replace('frame-', 'ref-')
    a = cv2.imread(f, 0).astype(np.float32); b = cv2.imread(r, 0).astype(np.float32)
    if a.shape != b.shape: b = cv2.resize(b, (a.shape[1], a.shape[0]))
    if roi: a = a[roi[1]:roi[3], roi[0]:roi[2]]; b = b[roi[1]:roi[3], roi[0]:roi[2]]
    ab = cv2.GaussianBlur(a, (0, 0), 8); bb = cv2.GaussianBlur(b, (0, 0), 8)
    m = np.abs(ab - bb).mean(); raw = np.abs(a - b).mean()
    t = re.search(r'at-([\d.]+)s', f).group(1)
    tot.append(m)
    print(f"{t:>8} blurMAE {m:6.2f}  raw {raw:6.2f}  meanR {a.mean():6.1f} meanS {b.mean():6.1f}")
print(f"mean blurMAE {np.mean(tot):.2f}")
