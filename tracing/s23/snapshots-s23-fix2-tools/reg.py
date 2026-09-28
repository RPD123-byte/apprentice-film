#!/usr/bin/env python3
# reg.py dir k1,k2.. : blurred (σ8) abs error split by region (share of the frame total and mean inside)
import sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s23r-tools')
from m import src
d = sys.argv[1]; ks = [int(x) for x in sys.argv[2].split(',')]
R = {'aura': (440, 280, 960, 660), 'header': (140, 128, 2070, 400), 'bottom': (0, 700, 2206, 946), 'right': (1100, 400, 2206, 700)}
for k in ks:
    a = cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f'{d}/r{k:05d}.png'), cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 8)
    b = cv2.GaussianBlur(cv2.cvtColor(src(k), cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 8)
    e = np.abs(a - b); s = a - b; tot = e.sum()
    out = [f'k={k} MAE={e.mean():.2f}']
    for n, (x0, y0, x1, y1) in R.items():
        sub = e[y0:y1, x0:x1]; out.append(f'{n}: {sub.sum()/tot*100:.0f}% m={sub.mean():.1f} sgn={s[y0:y1,x0:x1].mean():+.1f}')
    print('  '.join(out))
