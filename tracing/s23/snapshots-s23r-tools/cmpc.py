#!/usr/bin/env python3
# cmpc.py DIR out.jpg x0 y0 x1 y1 k1 k2 ... [--w W]: crops render | source per k, stacked
import sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s23r-tools')
from m import src
a = sys.argv[1:]; W = 900
if '--w' in a: i = a.index('--w'); W = int(a[i + 1]); a = a[:i] + a[i + 2:]
d, out = a[0], a[1]; x0, y0, x1, y1 = map(int, a[2:6]); rows = []
for k in map(int, a[6:]):
    r = cv2.imread(f'{d}/r{k:05d}.png')
    if r is None: continue
    s = src(k)
    pr = r[y0:y1, x0:x1]; ps = s[y0:y1, x0:x1]
    row = np.hstack([pr, np.full((pr.shape[0], 4, 3), 255, np.uint8), ps])
    sc = W * 2 / row.shape[1]; row = cv2.resize(row, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC)
    cv2.putText(row, f'{k/25:.2f}', (4, 16), 0, 0.5, (0, 255, 255), 1)
    rows.append(row); rows.append(np.full((3, row.shape[1], 3), 128, np.uint8))
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 85])
