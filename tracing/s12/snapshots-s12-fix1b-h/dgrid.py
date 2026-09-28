# dgrid.py render.png source.png x0 y0 x1 y1 cell [sigma]  -> signed mean (render - source) per cell (finished frames, blurred)
import cv2, numpy as np, sys
R = cv2.imread(sys.argv[1], 0).astype(np.float32); S = cv2.imread(sys.argv[2], 0).astype(np.float32)
x0, y0, x1, y1, c = map(int, sys.argv[3:8]); sg = float(sys.argv[8]) if len(sys.argv) > 8 else 3
D = cv2.GaussianBlur(R, (0, 0), sg) - cv2.GaussianBlur(S, (0, 0), sg)
print('      ' + ' '.join('%4d' % x for x in range(x0, x1, c)))
for y in range(y0, y1, c):
  print('%5d ' % y + ' '.join('%4d' % D[y:y + c, x:x + c].mean() for x in range(x0, x1, c)))
