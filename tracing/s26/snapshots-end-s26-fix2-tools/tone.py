#!/usr/bin/env python3
# tone.py DIR PREFIX [F0-F1] [--box x0 y0 x1 y1]: tone comparison render vs source on sigma-4 blurred frames
# (per-channel medians, mean L*, mean chroma), per beat
import cv2, numpy as np, sys, glob, re
a = sys.argv[1:]; d, pre = a[0], a[1]
fr = [int(v) for v in a[2].split('-')] if len(a) > 2 and '-' in a[2] else None
box = [int(v) for v in a[a.index('--box')+1:a.index('--box')+5]] if '--box' in a else None
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas/src/'
BEATS = [('A', 2763, 2788), ('B', 2789, 2789), ('C', 2790, 2817), ('D', 2818, 2842), ('E', 2843, 2853), ('F1', 2854, 2887), ('F2', 2888, 2938)]
rows = {}
for p in glob.glob(f'{d}/{pre}*.png'):
    F = int(re.search(r'(\d+)\.png$', p).group(1))
    if fr and not (fr[0] <= F <= fr[1]): continue
    r = cv2.imread(p); s = cv2.imread(f'{SRC}{F}.png')
    if box: r = r[box[1]:box[3], box[0]:box[2]]; s = s[box[1]:box[3], box[0]:box[2]]
    out = []
    for im in (r, s):
        b = cv2.GaussianBlur(im.astype(np.float32), (0, 0), 4)
        med = np.median(b.reshape(-1, 3), 0)[::-1]
        lab = cv2.cvtColor(b / 255, cv2.COLOR_BGR2LAB)
        out.append((med, lab[..., 0].mean(), np.hypot(lab[..., 1], lab[..., 2]).mean(), [np.percentile(b[..., c], q) for c in (2, 1, 0) for q in (10, 50, 90)]))
    rows[F] = out
for nm, f0, f1 in BEATS:
    v = [rows[F] for F in sorted(rows) if f0 <= F <= f1]
    if not v: continue
    mr = np.mean([x[0][0] for x in v], 0); ms = np.mean([x[1][0] for x in v], 0)
    print(f'{nm:3s} n={len(v):3d} medRGB render {mr.round(1)} src {ms.round(1)}  L* {np.mean([x[0][1] for x in v]):.1f}/{np.mean([x[1][1] for x in v]):.1f}  C* {np.mean([x[0][2] for x in v]):.1f}/{np.mean([x[1][2] for x in v]):.1f}')
