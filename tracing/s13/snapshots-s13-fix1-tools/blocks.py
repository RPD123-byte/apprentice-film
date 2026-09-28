# blocks.py RENDERDIR FRAME x0,y0,x1,y1 [B=30] [sigma=3] : signed mean (render - source) of blurred images per BxB block
import sys, numpy as np, cv2
from common import *
d, f = sys.argv[1], int(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3].split(',')); B = int(sys.argv[4]) if len(sys.argv) > 4 else 30
sg = float(sys.argv[5]) if len(sys.argv) > 5 else 3
R = cv2.GaussianBlur(cv2.imread(f'{d}/r{f}.png', 0).astype(np.float32), (0, 0), sg); S = cv2.GaussianBlur(src(f), (0, 0), sg)
print('      ' + ''.join(f'{x:6d}' for x in range(x0, x1, B)))
for y in range(y0, y1, B):
    print(f'{y:5d} ' + ''.join(f'{(R[y:y + B, x:x + B] - S[y:y + B, x:x + B]).mean():+6.0f}' for x in range(x0, x1, B)))
