# usage: tiles.py DIR IDX x0 y0 x1 y1 step  -> signed mean diff (render - source) on sigma-6 blurred frames, per tile
import cv2, sys, glob, numpy as np
d, idx = sys.argv[1], sys.argv[2]; x0, y0, x1, y1, st = map(int, sys.argv[3:8])
r = cv2.imread(glob.glob(f"{d}/frame-{idx}-*.png")[0], 0).astype(float); s = cv2.imread(glob.glob(f"{d}/ref-{idx}-*.png")[0], 0).astype(float)
R, S = cv2.GaussianBlur(r, (0, 0), 6), cv2.GaussianBlur(s, (0, 0), 6)
print('      ' + ' '.join('%5d' % x for x in range(x0, x1, st)))
for y in range(y0, y1, st):
    print('%5d ' % y + ' '.join('%+5d' % (R[y:y+st, x:x+st].mean() - S[y:y+st, x:x+st].mean()) for x in range(x0, x1, st)))
print('MAE', np.abs(R - S)[y0:y1, x0:x1].mean())
