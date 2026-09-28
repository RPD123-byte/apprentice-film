# timing check: render exact source frames F/25 and score against source F-2..F+2 (sigma2 MAE, rows 0-500)
import sys, os, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from run import build, Lab, src, gray
Fs = [int(v) for v in sys.argv[2].split(',')]; out = sys.argv[1]; os.makedirs(out, exist_ok=True)
L = Lab(build())
for F in Fs:
    im, ms = L.frame(F / 25)
    cv2.imwrite(f'{out}/r{F:04d}.png', im)
    a = cv2.GaussianBlur(gray(im), (0, 0), 2)[:500]
    sc = {}
    for d in (-2, -1, 0, 1, 2):
        S = src(F + d)
        if S is None: continue
        sc[d] = np.abs(a - cv2.GaussianBlur(gray(S), (0, 0), 2)[:500]).mean()
    best = min(sc, key=sc.get)
    print(F, f'{F/25:.2f}', f'{ms:.0f}ms', ' '.join(f'{d:+d}:{v:.2f}' for d, v in sorted(sc.items())), 'best', best, flush=True)
L.close()
