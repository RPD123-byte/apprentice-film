#!/usr/bin/env python3
# Compare harness renders (DIR/rF.png) with source frames (s26c-meas/src/F.png): mean CIE76 dE on sigma-8 blurred
# frames (optionally within a box), and write side-by-side pairs. Usage: cmp.py DIR [--pairs] [--box x0 y0 x1 y1] [--sig 8]
import cv2, numpy as np, sys, glob, os, re
a = sys.argv[1:]; d = a[0]
pairs = '--pairs' in a
box = None
if '--box' in a: i = a.index('--box'); box = [int(v) for v in a[i+1:i+5]]
sig = float(a[a.index('--sig')+1]) if '--sig' in a else 8.0
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas/src'
def lab(im):
    f = cv2.GaussianBlur(im.astype(np.float32) / 255.0, (0, 0), sig) if sig > 0 else im.astype(np.float32) / 255.0
    return cv2.cvtColor(f, cv2.COLOR_BGR2LAB)
tot = []
for p in sorted(glob.glob(d + '/r*.png'), key=lambda p: int(re.search(r'r(\d+)\.png', p).group(1))):
    F = int(re.search(r'r(\d+)\.png', p).group(1))
    r = cv2.imread(p); s = cv2.imread(f'{SRC}/{F}.png')
    if s is None: continue
    A, B = lab(r), lab(s)
    dE = np.sqrt(((A - B) ** 2).sum(2))
    if box: dE = dE[box[1]:box[3], box[0]:box[2]]
    m = float(dE.mean()); tot.append(m)
    print(f'F{F} t={F/25:.2f} dE{int(sig)}={m:.2f}')
    if pairs:
        im = np.hstack([r, s]) if not box else np.hstack([r[box[1]:box[3], box[0]:box[2]], s[box[1]:box[3], box[0]:box[2]]])
        sc = 1920 / im.shape[1]
        cv2.imwrite(f'{d}/pair{F}.jpg', cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 88])
if tot: print('mean', round(float(np.mean(tot)), 3), 'n', len(tot))
