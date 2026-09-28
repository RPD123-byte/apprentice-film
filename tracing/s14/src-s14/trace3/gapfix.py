# Scale the gap view's gain (s14.js GAP table, column 5) so the render's lit area matches the source's (pre-grade
# mean inside the source's lit area, owl masked). gapfix.py renderdir [k]  (renders at the GAP row times; the
# 36.9 row is read at 36.96)
import sys, re, glob, cv2, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *
from gapratio import ratio
from tone3 import owl_mask
rd = sys.argv[1]; k = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
P = ROOT + '/src/shots/s14.js'
s = open(P).read()
m = re.search(r'const GAP = \[(.*?)\n\];', s, re.S)
body = m.group(1)
rows = re.findall(r'\[([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+)\]', body)
fr = {round(float(re.search(r'at-([\d.]+)s', f).group(1)), 2): f for f in glob.glob(rd + '/frame-*.png')}
new = body
for r in rows:
    t = float(r[0]); tt = 36.96 if t < 36.95 else t
    if tt >= 40 or round(tt, 2) not in fr: continue
    R, den, sim = ratio(tt, 6)
    S = src(tt); Rn = cv2.imread(fr[round(tt, 2)])
    om = owl_mask(luma(S), tt) | owl_mask(luma(Rn), tt)
    lit = (R > 0.2) & (den > 0.05) & ~om
    vs = pregrade(luma(S), tt)[lit].mean(); vr = pregrade(luma(Rn), tt)[lit].mean()
    g = float(r[5]); g2 = g * (1 + k * (vs / max(vr, 1e-4) - 1))
    print(f'{t:.2f} lit {lit.sum()} pre {vr:.3f}/{vs:.3f} gain {g:.3f} -> {g2:.3f}')
    old = '[' + ', '.join(r) + ']'
    r2 = list(r); r2[5] = f'{g2:.3f}'
    new = new.replace(old, '[' + ', '.join(r2) + ']', 1)
s = s[:m.start(1)] + new + s[m.end(1):]
open(P, 'w').write(s)
