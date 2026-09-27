# cmp.py outdir frames [crops]  -> per-region blurred error and fine-detail ratio (render / source), graded frames
import cv2, numpy as np, sys
out = sys.argv[1]; frames = [int(v) for v in sys.argv[2].split(',')]
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s16-p2-src'
REG = {'beanie': (1210, 5, 1600, 100), 'face': (1300, 130, 1540, 440), 'eyes': (1280, 195, 1540, 235), 'hairL': (1195, 150, 1285, 420),
       'shirtL': (1000, 440, 1300, 660), 'shirtR': (1560, 440, 1860, 760), 'hphones': (1230, 400, 1600, 650), 'laptop': (990, 650, 1520, 850),
       'mug': (690, 710, 915, 850), 'steam': (740, 400, 870, 700), 'desk': (620, 850, 2206, 905), 'books': (1690, 755, 2170, 850), 'owl': (100, 450, 760, 946)}
def band(x): return cv2.GaussianBlur(x, (0, 0), 0.7) - cv2.GaussianBlur(x, (0, 0), 2.0)
tot = {}
for f in frames:
    r = cv2.imread(f'{out}/r{f}.png', 0).astype(np.float32); s = cv2.imread(f'{SRC}/f{f}.png', 0).astype(np.float32)
    br, bs = band(r), band(s)
    e2 = np.abs(cv2.GaussianBlur(r, (0, 0), 2) - cv2.GaussianBlur(s, (0, 0), 2)); e8 = np.abs(cv2.GaussianBlur(r, (0, 0), 8) - cv2.GaussianBlur(s, (0, 0), 8))
    line = [f'{f}: all s2 {e2.mean():.2f} s8 {e8.mean():.2f} | mean r {r.mean():.1f} s {s.mean():.1f}']
    for k, (x0, y0, x1, y1) in REG.items():
        dr = br[y0:y1, x0:x1].std(); ds = bs[y0:y1, x0:x1].std()
        a = e2[y0:y1, x0:x1].mean(); b8 = e8[y0:y1, x0:x1].mean()
        mr = r[y0:y1, x0:x1].mean(); ms = s[y0:y1, x0:x1].mean()
        line.append(f'  {k:8s} s2 {a:5.1f} s8 {b8:5.1f}  mean {mr:5.1f}/{ms:5.1f}  detail {dr / max(ds, 1e-3):.2f}')
    print('\n'.join(line))
