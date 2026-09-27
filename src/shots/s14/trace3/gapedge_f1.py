# fix pass 1: the lit gap's top / bottom rows (first / last row whose p90 over the gap's columns exceeds 20 luma,
# blurred sigma 3, owl columns excluded) and its darks (p5 inside the lit area): gapedge_f1.py dir
import cv2, numpy as np, glob, re, sys
d = sys.argv[1]
fs = sorted(glob.glob(d + '/frame-*.png'), key=lambda f: float(re.search(r'at-([\d.]+)s', f).group(1)))
for f in fs:
    t = float(re.search(r'at-([\d.]+)s', f).group(1))
    if t >= 39.98: continue
    out = []
    for nm, fn in (('ren', f), ('src', f.replace('frame-', 'ref-'))):
        L = cv2.GaussianBlur(cv2.cvtColor(cv2.imread(fn), cv2.COLOR_BGR2GRAY).astype(float), (0, 0), 3)
        x0 = 900 if t < 38.5 else 300
        cols = L[:, x0:2150]
        p = np.percentile(cols, 90, axis=1)
        rows = np.nonzero(p > 20)[0]
        top, bot = (int(rows[0]), int(rows[-1])) if len(rows) else (-1, -1)
        lit = cols[cols > 20]
        raw = cv2.cvtColor(cv2.imread(fn), cv2.COLOR_BGR2GRAY).astype(float)[:, x0:2150]
        m = cv2.GaussianBlur(raw, (0, 0), 12) > 30
        p5 = np.percentile(raw[m], 5) if m.sum() > 100 else -1
        out.append(f'{nm} top {top} bot {bot} p5 {p5:.0f}')
    print(f'{t:.2f}', ' | '.join(out))
