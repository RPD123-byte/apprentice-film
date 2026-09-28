# agg.py RENDERDIR [B=40] [N=30] : sum over all rendered frames of the sigma-8 |render - source| per BxB block (the
# error "mass" that block contributes to the mean MAE); prints the top N blocks with signed mean per pose group
import sys, glob, re, numpy as np, cv2
from common import *
d = sys.argv[1]; B = int(sys.argv[2]) if len(sys.argv) > 2 else 40; N = int(sys.argv[3]) if len(sys.argv) > 3 else 30
POSE = lambda f: 'A' if f <= 885 else 'B' if f <= 887 else 'S' if f <= 889 else 'C' if f <= 898 else 'T' if f <= 900 else 'D' if f <= 911 else 'E' if f == 912 else 'R'
H, W = 946 // B, 2206 // B
tot = np.zeros((H, W)); sg = {}
fs = sorted(int(re.search(r'r(\d+)\.png', p).group(1)) for p in glob.glob(d + '/r*.png'))
fs = [f for f in fs if 884 <= f <= 922]
for f in fs:
    R = cv2.GaussianBlur(cv2.imread(f'{d}/r{f}.png', 0).astype(np.float32), (0, 0), 8); S = cv2.GaussianBlur(src(f), (0, 0), 8)
    D = (R - S)[:H * B, :W * B].reshape(H, B, W, B)
    tot += np.abs(D).mean((1, 3)); sg.setdefault(POSE(f), []).append(D.mean((1, 3)))
tot /= len(fs)
print(f'{len(fs)} frames; mean block |err| {tot.mean():.2f}; top blocks (x, y, mean|err| over frames, signed mean per pose):')
idx = np.argsort(tot.ravel())[::-1][:N]
for i in idx:
    y, x = divmod(i, W)
    print(f'  ({x * B:4d},{y * B:3d}) {tot[y, x]:5.1f}  ' + ' '.join(f'{k}{np.mean([m[y, x] for m in v]):+4.0f}' for k, v in sg.items()))
