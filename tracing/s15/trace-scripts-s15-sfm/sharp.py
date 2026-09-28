# gradient energy (sharpness) of render vs source, per frame, excluding the owl: ratio > 1 = render sharper
import cv2, numpy as np, glob, re, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s15-sfm')
from common import owlmask
d = sys.argv[1]; R = []
for fp in sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1))):
    t = float(re.search(r'at-([\d.]+)s', fp).group(1)); fi = int(np.ceil(t * 25 - 1e-6))
    a = cv2.imread(fp, 0).astype(np.float32); b = cv2.imread(fp.replace('frame-', 'ref-'), 0).astype(np.float32)
    m = owlmask(fi, 1.1)
    def ge(x):
        x = cv2.GaussianBlur(x, (0, 0), 1.2); gx = cv2.Sobel(x, cv2.CV_32F, 1, 0); gy = cv2.Sobel(x, cv2.CV_32F, 0, 1)
        g = np.hypot(gx, gy); return g[m].mean()
    R.append((t, ge(a) / max(ge(b), 1e-3)))
for t, r in R: print(f'{t:.2f} {r:.2f}', end='  ')
print('\nmean ratio', np.mean([r for _, r in R]))
