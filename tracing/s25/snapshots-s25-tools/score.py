#!/usr/bin/env python3
# score.py OUTDIR [--pairs] [--box x0 y0 x1 y1] [--sheet N]  -- score every rNNNNN.png in OUTDIR against source frame N
# metric: grayscale mean |diff| after gaussian sigma 8 (and sigma 2), /255 scale; writes pair-NNNNN.jpg (render | source)
import cv2, numpy as np, glob, sys, os, re
out = sys.argv[1]
args = sys.argv[2:]
pairs = '--pairs' in args
box = None
if '--box' in args:
    i = args.index('--box'); box = [int(v) for v in args[i + 1:i + 5]]
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s25-src/f%05d.png'
rows = []
fs = sorted(glob.glob(out + '/r*.png'))
for p in fs:
    f = int(re.search(r'r(\d+)\.png', p).group(1))
    r = cv2.imread(p); s = cv2.imread(SRC % f)
    if s is None: continue
    rg = cv2.cvtColor(r, cv2.COLOR_BGR2GRAY).astype(np.float32); sg = cv2.cvtColor(s, cv2.COLOR_BGR2GRAY).astype(np.float32)
    b8 = np.abs(cv2.GaussianBlur(rg, (0, 0), 8) - cv2.GaussianBlur(sg, (0, 0), 8))
    b2 = np.abs(cv2.GaussianBlur(rg, (0, 0), 2) - cv2.GaussianBlur(sg, (0, 0), 2))
    m8 = b8.mean(); m2 = b2.mean()
    bx = b8[box[1]:box[3], box[0]:box[2]].mean() if box else 0
    rows.append((f, m8, m2, bx))
    if pairs:
        pr = np.hstack([cv2.resize(r, (1103, 473), interpolation=cv2.INTER_AREA), cv2.resize(s, (1103, 473), interpolation=cv2.INTER_AREA)])
        cv2.putText(pr, f'{f/25:.2f} s8 {m8:.1f}', (8, 20), 0, 0.6, (0, 255, 255), 1)
        cv2.imwrite(out + f'/pair-{f:05d}.jpg', pr, [cv2.IMWRITE_JPEG_QUALITY, 85])
for f, m8, m2, bx in rows: print(f'{f} {f/25:.2f} s8 {m8:5.2f} s2 {m2:5.2f}' + (f' box {bx:5.2f}' if box else ''))
if rows: print('mean s8 %.2f s2 %.2f' % (np.mean([r[1] for r in rows]), np.mean([r[2] for r in rows])) + (' box %.2f' % np.mean([r[3] for r in rows]) if box else ''))
