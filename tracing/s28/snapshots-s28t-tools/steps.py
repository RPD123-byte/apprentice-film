# s28t: consecutive-frame steps, render vs source (and film), σ4 blurred abs diff. Usage: steps.py DIR [--film]
import cv2, numpy as np, sys, glob, re
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28t-tools')
from m import frame, SRC, FILM, bl, d
D = sys.argv[1]
fs = sorted(glob.glob(D + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
prev = None
for p in fs:
    t = float(re.search(r'at-([\d.]+)s', p).group(1)); tf = np.floor(t * 30 + 1e-6) / 30; k = int(np.ceil(tf * 25 - 1e-6))
    r = cv2.imread(p); s = frame(SRC, k); f = frame(FILM, k) if '--film' in sys.argv else None
    line = f'{k/25:7.2f}  err s4 {d(r,s,4):5.2f} s12 {d(r,s,12):5.2f}'
    if prev is not None:
        pr, ps, pf = prev
        line += f'   step render {d(r,pr,4):5.2f} source {d(s,ps,4):5.2f}' + (f' film {d(f,pf,4):5.2f}' if f is not None else '')
    print(line); prev = (r, s, f)
