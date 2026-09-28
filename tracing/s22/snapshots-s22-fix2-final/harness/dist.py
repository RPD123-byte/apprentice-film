# dist.py DIR side frames: σ3 residual by distance band from the owl in one side margin
import sys, cv2, numpy as np
sys.path.insert(0, '.')
from run import src, gray
d, side = sys.argv[1], sys.argv[2]; Fs = [int(v) for v in sys.argv[3].split(',')]
reg = np.zeros((946, 2206), bool)
if side == 'R': reg[100:520, 2023:2206] = True
elif side == 'L': reg[250:560, 0:144] = True
else: reg[0:128, :] = True
bands = [(3, 15), (15, 30), (30, 50), (50, 70), (70, 110), (110, 200)]
acc = []
for F in Fs:
    A = gray(cv2.imread(f'{d}/r{F:04d}.png')); B = gray(src(F))
    owl = (cv2.GaussianBlur(B, (0, 0), 1.5) > 110) | (cv2.GaussianBlur(A, (0, 0), 1.5) > 110)
    dist = cv2.distanceTransform(1 - owl.astype(np.uint8), cv2.DIST_L2, 5)
    D = cv2.GaussianBlur(A, (0, 0), 3) - cv2.GaussianBlur(B, (0, 0), 3)
    acc.append([D[reg & (dist > lo) & (dist <= hi) & ~owl].mean() for lo, hi in bands])
print(side, ' '.join(f'{lo}-{hi}:{v:+5.2f}' for (lo, hi), v in zip(bands, np.mean(acc, 0))))
