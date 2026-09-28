# gapprof.py dir: horizontal profile of the lit gap above the owl (blurred luma) render vs source
import sys, cv2, numpy as np, glob, re
d = sys.argv[1]
BKTOP = {38.52: 517, 38.8: 563, 39.08: 573, 39.12: 582, 39.4: 592, 39.6: 605, 39.72: 613, 39.84: 619, 39.88: 621, 39.96: 620}
fs = sorted(glob.glob(d + '/frame-*.png'), key=lambda f: float(re.search(r'at-([\d.]+)s', f).group(1)))
for f in fs:
    t = float(re.search(r'at-([\d.]+)s', f).group(1))
    if t >= 40: continue
    S = cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f.replace('frame-', 'ref-')), cv2.COLOR_BGR2GRAY).astype(float), (0, 0), 6)
    otop = 520 if t < 38.5 else min([v for k, v in BKTOP.items() if k <= t + 1e-3] or [520]) * (1 if t < 39.9 else 1)
    rowmax = S[:, 1000:].max(1)
    lit = np.where(rowmax > 0.4 * rowmax[:int(otop)].max())[0]
    lit = lit[lit < otop - 15]
    y0 = int(lit.min()) + 8 if len(lit) else 350; y1 = min(int(otop) - 15, y0 + 130)
    out = []
    for nm, p in (('R', f), ('S', f.replace('frame-', 'ref-'))):
        L = cv2.GaussianBlur(cv2.cvtColor(cv2.imread(p), cv2.COLOR_BGR2GRAY).astype(float), (0, 0), 6)
        prof = L[y0:y1].mean(0)
        pk = prof.max(); lo = np.percentile(prof, 3)
        a15 = np.argmax(prof > lo + 0.15 * (pk - lo)); a85 = np.argmax(prof > lo + 0.85 * (pk - lo))
        q = prof[::-1]; b15 = len(q) - 1 - np.argmax(q > lo + 0.15 * (pk - lo)); b85 = len(q) - 1 - np.argmax(q > lo + 0.85 * (pk - lo))
        out.append(f'{nm} pk {pk:3.0f}@{int(np.argmax(prof)):4d} L {a15:4d}-{a85:4d} (w{a85 - a15:3d}) R {b85:4d}-{b15:4d} (w{b15 - b85:3d})')
    print(f'{t:.2f} rows {y0}-{y1}', ' | '.join(out))
