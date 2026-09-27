# Gap view calibration: inside the source's lit area (gapratio > 0.2), compare render vs source (pre-grade) mean and
# percentiles per frame; outside it, the mean spill. gapcal.py renderdir
import sys, cv2, numpy as np, glob, re
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *
from gapratio import ratio
from tone3 import owl_mask
rd = sys.argv[1]
for f in sorted(glob.glob(rd + '/frame-*.png'), key=lambda f: float(re.search(r'at-([\d.]+)s', f).group(1))):
    t = float(re.search(r'at-([\d.]+)s', f).group(1))
    if t >= 40: continue
    R, den, sim = ratio(t, 6)
    S = src(t); Rn = cv2.imread(f)
    om = owl_mask(luma(S), t) | owl_mask(luma(Rn), t)
    lit = (R > 0.2) & (den > 0.05) & ~om
    out = (R <= 0.2) & ~om
    Vs = luma(S) * 255; Vr = luma(Rn) * 255
    bs, br = cv2.GaussianBlur(Vs, (0, 0), 8), cv2.GaussianBlur(Vr, (0, 0), 8)
    print(f'{t:.2f} lit n={lit.sum()} mean {Vr[lit].mean():.1f}/{Vs[lit].mean():.1f} p50 {np.percentile(Vr[lit],50):.0f}/{np.percentile(Vs[lit],50):.0f} p95 {np.percentile(Vr[lit],95):.0f}/{np.percentile(Vs[lit],95):.0f}  blur8 err lit {np.abs(br-bs)[lit].mean():.1f}  outside mean {Vr[out].mean():.1f}/{Vs[out].mean():.1f}')
