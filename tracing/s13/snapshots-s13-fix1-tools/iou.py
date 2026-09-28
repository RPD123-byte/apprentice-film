# iou.py RENDERDIR FRAME out.jpg : lit-silhouette mismatch (blur 1, > 70): red = lit only in the render, cyan = only in source
import sys, numpy as np, cv2
from common import *
d, f = sys.argv[1], int(sys.argv[2])
R = cv2.GaussianBlur(cv2.imread(f'{d}/r{f}.png', 0).astype(np.float32), (0, 0), 1) > 70; S = cv2.GaussianBlur(src(f), (0, 0), 1) > 70
im = np.zeros((946, 2206, 3), np.uint8); im[R & S] = (70, 70, 70); im[R & ~S] = (0, 0, 255); im[S & ~R] = (255, 255, 0)
ys, xs = np.nonzero(R | S); im = im[max(0, ys.min() - 5):ys.max() + 5, max(0, xs.min() - 5):xs.max() + 5]
for x in range(0, im.shape[1], 50): cv2.putText(im, str(x + max(0, xs.min() - 5)), (x, 12), 0, 0.35, (0, 255, 0), 1)
for y in range(0, im.shape[0], 50): cv2.putText(im, str(y + max(0, ys.min() - 5)), (2, y), 0, 0.35, (0, 255, 0), 1)
cv2.imwrite(sys.argv[3], cv2.resize(im, None, fx=0.75, fy=0.75))
print('render-only', int((R & ~S).sum()), 'source-only', int((S & ~R).sum()), 'iou %.3f' % ((R & S).sum() / (R | S).sum()))
