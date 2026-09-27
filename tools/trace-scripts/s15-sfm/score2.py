# finer-scale error (blur sigma 4) + coarse (sigma 12), owl excluded
import cv2, numpy as np, glob, re, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s15-sfm')
from common import owlmask
d = sys.argv[1]; E4 = []; E12 = []
for fp in sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1))):
    t = float(re.search(r'at-([\d.]+)s', fp).group(1)); fi = int(np.ceil(t * 25 - 1e-6))
    a = cv2.imread(fp, 0).astype(np.float32); b = cv2.imread(fp.replace('frame-', 'ref-'), 0).astype(np.float32)
    m = owlmask(fi, 1.1)
    for s, E in ((4, E4), (12, E12)):
        E.append(np.abs(cv2.GaussianBlur(a, (0, 0), s) - cv2.GaussianBlur(b, (0, 0), s))[m].mean())
print(f'sigma4 {np.mean(E4):.2f}  sigma12 {np.mean(E12):.2f}  n={len(E4)}')
