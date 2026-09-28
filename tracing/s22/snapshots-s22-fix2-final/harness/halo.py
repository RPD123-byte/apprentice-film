# halo.py DIR [frames]: the owl's near halo in the side/top margins, render vs source (σ3): mean residual and MAE in the
# band 3–70 px from the owl's silhouette (outside the screen), and in 70–250 px, per frame
import sys, glob, re, cv2, numpy as np
sys.path.insert(0, '.')
from run import src, gray
d = sys.argv[1]
Fs = [int(v) for v in sys.argv[2].split(',')] if len(sys.argv) > 2 else sorted(int(re.search(r'r(\d+)\.png', p).group(1)) for p in glob.glob(f'{d}/r*.png'))
out = np.ones((946, 2206), bool); out[128:, 144:2023] = False
acc = []
for F in Fs:
    A = gray(cv2.imread(f'{d}/r{F:04d}.png')); B = gray(src(F))
    owl = ((cv2.GaussianBlur(B, (0, 0), 1.5) > 110) | (cv2.GaussianBlur(A, (0, 0), 1.5) > 110)) & out
    owl = cv2.morphologyEx(owl.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    dist = cv2.distanceTransform(1 - owl, cv2.DIST_L2, 5)
    a3, b3 = cv2.GaussianBlur(A, (0, 0), 3), cv2.GaussianBlur(B, (0, 0), 3)
    D = a3 - b3
    near = (dist > 3) & (dist <= 70) & out; far = (dist > 70) & (dist <= 250) & out
    r = [D[near].mean(), np.abs(D[near]).mean(), D[far].mean(), np.abs(D[far]).mean()]
    acc.append(r); print(F, 'near bias %+5.2f mae %5.2f | far bias %+5.2f mae %5.2f' % tuple(r))
print('mean near bias %+5.2f mae %5.2f | far bias %+5.2f mae %5.2f' % tuple(np.mean(acc, 0)))
