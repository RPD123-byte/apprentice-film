# box.py DIR F x0 y0 x1 y1 [F x0 y0 x1 y1 ...]: σ3 residual (render − source) mean / MAE in boxes, source-owl pixels masked
import sys, cv2, numpy as np
sys.path.insert(0, '.')
from run import src, gray
d = sys.argv[1]; a = sys.argv[2:]; out = []
for i in range(0, len(a), 5):
    F, x0, y0, x1, y1 = [int(v) for v in a[i:i + 5]]
    A = gray(cv2.imread(f'{d}/r{F:04d}.png')); B = gray(src(F))
    m = ~cv2.dilate(((cv2.GaussianBlur(B, (0, 0), 1.5) > 110) | (cv2.GaussianBlur(A, (0, 0), 1.5) > 110)).astype(np.uint8), np.ones((7, 7), np.uint8)).astype(bool)
    D = (cv2.GaussianBlur(A, (0, 0), 3) - cv2.GaussianBlur(B, (0, 0), 3))[y0:y1, x0:x1][m[y0:y1, x0:x1]]
    out.append((D.mean(), np.abs(D).mean()))
print(' '.join('%+5.2f/%4.2f' % o for o in out), '| mean %+5.2f/%4.2f' % tuple(np.mean(out, 0)))
