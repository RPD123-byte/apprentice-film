#!/usr/bin/env python3
# score.py DIR PREFIX [--sig 4,8,12] [--box x0 y0 x1 y1] [--frames a-b] [--beats]
# mean CIE76 dE of Gaussian-blurred frames (render DIR/PREFIX{F}.png vs source s26c-meas/src/F.png)
import cv2, numpy as np, sys, glob, re
a = sys.argv[1:]; d, pre = a[0], a[1]
sigs = [float(s) for s in (a[a.index('--sig')+1] if '--sig' in a else '4,8,12').split(',')]
box = [int(v) for v in a[a.index('--box')+1:a.index('--box')+5]] if '--box' in a else None
fr = [int(v) for v in a[a.index('--frames')+1].split('-')] if '--frames' in a else None
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas/src/'
BEATS = [('A', 2763, 2788), ('B', 2789, 2789), ('C', 2790, 2817), ('D', 2818, 2842), ('E', 2843, 2853), ('F1', 2854, 2887), ('F2', 2888, 2938)]
def lab(im, s):
    f = im.astype(np.float32) / 255.0
    if s > 0: f = cv2.GaussianBlur(f, (0, 0), s)
    return cv2.cvtColor(f, cv2.COLOR_BGR2LAB)
rows = []
for p in sorted(glob.glob(f'{d}/{pre}*.png'), key=lambda p: int(re.search(r'(\d+)\.png$', p).group(1))):
    F = int(re.search(r'(\d+)\.png$', p).group(1))
    if fr and not (fr[0] <= F <= fr[1]): continue
    r = cv2.imread(p); s = cv2.imread(f'{SRC}{F}.png')
    if s is None or r is None: continue
    vals = []
    for sg in sigs:
        dE = np.sqrt(((lab(r, sg) - lab(s, sg)) ** 2).sum(2))
        if box: dE = dE[box[1]:box[3], box[0]:box[2]]
        vals.append(float(dE.mean()))
    rows.append((F, vals))
    if '--quiet' not in a: print(f'F{F} t={F/25:.2f} ' + ' '.join(f's{int(sg)}={v:.2f}' for sg, v in zip(sigs, vals)))
if rows:
    if '--beats' in a:
        for nm, f0, f1 in BEATS:
            v = [x[1] for x in rows if f0 <= x[0] <= f1]
            if v: print(f'{nm:3s} {f0}-{f1} n={len(v):3d} ' + ' '.join(f's{int(sg)}={np.mean([q[i] for q in v]):.2f}' for i, sg in enumerate(sigs)))
    print('ALL n=%d ' % len(rows) + ' '.join(f's{int(sg)}={np.mean([q[1][i] for q in rows]):.2f}' for i, sg in enumerate(sigs)))
