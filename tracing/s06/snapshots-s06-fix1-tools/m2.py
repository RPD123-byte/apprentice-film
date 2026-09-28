#!/usr/bin/env python3
# s06 fix1 metrics on render.mjs output (DIR/f-<frame>.png) against the exact source frame (s06-fix1-src/s-<n>.png).
# Usage: m2.py DIR [regions,...] [--defects]
import cv2, numpy as np, glob, re, sys, os
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s06-fix1-src'
R = {'full': (0, 0, 2206, 946), 'face': (780, 180, 1330, 760), 'mouth': (1000, 600, 1320, 760), 'brows': (800, 180, 1320, 300),
     'lbrow': (750, 170, 1060, 300), 'rbrow': (1100, 170, 1340, 280),
     'eyes': (780, 280, 1330, 420), 'hand': (560, 350, 1000, 800), 'hair': (700, 120, 1450, 560), 'beanie': (560, 0, 1450, 200),
     'owl': (1450, 150, 1900, 650), 'owleye': (1560, 330, 1860, 480), 'hoodieL': (50, 400, 560, 800), 'hoodieR': (1300, 550, 2100, 860),
     'roomL': (0, 0, 560, 400), 'roomR': (1900, 0, 2206, 946), 'laptop': (450, 800, 1900, 946), 'jawR': (1250, 430, 1440, 800)}
d = sys.argv[1]
keys = sys.argv[2].split(',') if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else ['full', 'face', 'mouth', 'brows', 'lbrow', 'rbrow', 'eyes', 'hand', 'hair', 'owl', 'jawR', 'hoodieR', 'laptop']
def ssim(a, b, s=1.5):
    C1, C2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    ma, mb = cv2.GaussianBlur(a, (0, 0), s), cv2.GaussianBlur(b, (0, 0), s)
    va = cv2.GaussianBlur(a * a, (0, 0), s) - ma * ma; vb = cv2.GaussianBlur(b * b, (0, 0), s) - mb * mb; cv = cv2.GaussianBlur(a * b, (0, 0), s) - ma * mb
    return ((2 * ma * mb + C1) * (2 * cv + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2))
fs = sorted(glob.glob(d + '/f-*.png'), key=lambda p: int(re.search(r'f-(\d+)', p).group(1)))
acc = {k: [] for k in keys}
print('frame ' + ' '.join(f'{k:>13s}' for k in keys))
D = []
for f in fs:
    n = int(re.search(r'f-(\d+)', f).group(1))
    A3 = cv2.imread(f).astype(np.float32); B3 = cv2.imread(f'{SRC}/s-{n}.png').astype(np.float32)
    a = cv2.cvtColor(A3, cv2.COLOR_BGR2GRAY); b = cv2.cvtColor(B3, cv2.COLOR_BGR2GRAY)
    b5, a5 = cv2.GaussianBlur(b, (0, 0), 5), cv2.GaussianBlur(a, (0, 0), 5); b1, a1 = cv2.GaussianBlur(b, (0, 0), 1.5), cv2.GaussianBlur(a, (0, 0), 1.5)
    S = ssim(a, b)
    row = []
    for kk in keys:
        x0, y0, x1, y1 = R[kk]; m5 = np.abs(a5 - b5)[y0:y1, x0:x1].mean(); m1 = np.abs(a1 - b1)[y0:y1, x0:x1].mean(); ss = S[y0:y1, x0:x1].mean()
        acc[kk].append((m5, m1, ss)); row.append(f'{m5:4.2f}/{m1:4.1f}/{ss:.2f}')
    print(f'{n:5d} ' + ' '.join(f'{r:>13s}' for r in row))
    if '--defects' in sys.argv:
        # 1 left brow blob: dark pixel counts in (828,192)-(868,224)
        box = (slice(192, 224), slice(828, 868))
        dk = [int((a[box] < th).sum()) for th in (60, 90)], [int((b[box] < th).sum()) for th in (60, 90)]
        # 3 owl feet arc: max of blurred (1px) r-s along x1580-1790 y595-625
        r1, s1 = cv2.GaussianBlur(a, (0, 0), 1), cv2.GaussianBlur(b, (0, 0), 1)
        feet = (r1 - s1)[595:625, 1580:1790].max()
        # 6 earcup seam: column step at x 1789 (mean over y 272-367 of err[x+2]-err[x-2])
        e = (a - b)
        ear = float(np.mean(e[272:367, 1790:1793]) - np.mean(e[272:367, 1785:1788]))
        # 2 lid seams: left rows 281-286 x808-943 and right rows 275-282 x1129-1183 (row mean errors)
        ll = [round(float(e[y, 808:943].mean()), 1) for y in range(280, 287)]
        rl = [round(float(e[y, 1129:1183].mean()), 1) for y in range(275, 283)]
        # 9 laptop rim: mean over x 300-1800 of rows 814-838 render vs source
        # 10 channel means (B,G,R) render - source
        ch = [round(float(A3[..., c].mean() - B3[..., c].mean()), 2) for c in range(3)]
        D.append((n, dk, round(float(feet), 1), round(ear, 1), ll, rl, ch))
print('mean  ' + ' '.join(f'{np.mean([v[0] for v in acc[k]]):4.2f}/{np.mean([v[1] for v in acc[k]]):4.1f}/{np.mean([v[2] for v in acc[k]]):.2f}' for k in keys))
for x in D: print('defects', x)
