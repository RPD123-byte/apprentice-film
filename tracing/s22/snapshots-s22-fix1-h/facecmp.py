# facecmp.py DIR [--table]: the cut drawing's face (cup-local u 22..44, v 2..28), render vs the per-side ECC median
import sys, glob, re, cv2, numpy as np
sys.path.insert(0, '.')
from singles import cupat, crop
d = sys.argv[1]; table = '--table' in sys.argv
box = [18, 2, 48, 32]; X0, Y0 = 18, 2
MED = {0: 'top2', 1: 'r2', 2: 'bot2', 3: 'l2'}
have = sorted(int(re.search(r'r(\d+)\.png', p).group(1)) for p in glob.glob(f'{d}/r*.png'))
def grid1(a):
    out = np.zeros((27, 23))
    for jj, v in enumerate(range(2, 29)):
        for ii, u in enumerate(range(22, 45)):
            i = int(round((u - X0 + 0.5) * 8 - 0.5)); j = int(round((v - Y0 + 0.5) * 8 - 0.5)); out[jj, ii] = a[j - 2:j + 3, i - 2:i + 3].mean()
    return out
per = {}
for F in have:
    c = cupat(F)
    if c is None or F / 25 > 79.76: continue
    s, cx, cy = c
    a = cv2.cvtColor(crop(cv2.imread(f'{d}/r{F:04d}.png'), cx, cy, s, box, 8).clip(0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(float)
    per.setdefault(s, []).append(grid1(a))
for s, L in sorted(per.items()):
    R = np.mean(L, 0); M = grid1(np.load(f'../s22-fix1-base/hm_{MED[s]}.npy'))
    eye = (slice(12, 24), slice(3, 20))   # v 14..25, u 25..41
    print(f'side {s} n={len(L)}  face MAE {np.abs(R - M).mean():.1f} bias {(R - M).mean():+.1f} | eye MAE {np.abs(R - M)[eye].mean():.1f} eye mean r/s {R[eye].mean():.0f}/{M[eye].mean():.0f} min r/s {R[eye].min():.0f}/{M[eye].min():.0f}')
    if table:
        print('     ' + ' '.join(f'{u:3d}' for u in range(22, 45)))
        for jj, v in enumerate(range(2, 29)): print(f'{v:4d} ' + ' '.join(f'{x:3.0f}' for x in R[jj]) + '   |' + ' '.join(f'{x:+4.0f}' for x in (R[jj] - M[jj])))
