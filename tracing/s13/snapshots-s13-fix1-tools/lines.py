# lines.py FRAMES x0,y0,x1,y1 MINLEN scale out.jpg : locate the long dark lines in a box (skeleton pieces of the ink
# map longer than MINLEN px), numbered on a picture, with their end points printed - an aid to reading key-line end
# points off the source (they are then measured as 3-point curves by fitline.py)
import sys, numpy as np, cv2
from skimage.morphology import skeletonize
from skimage.measure import label, regionprops
from common import *
fr = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2].split(',')); mn = int(sys.argv[3]); sc = float(sys.argv[4]); out = sys.argv[5]
thr = float(sys.argv[6]) if len(sys.argv) > 6 else 0.2
P = cv2.GaussianBlur(srcpre(fr), (0, 0), 0.8); paper = cv2.GaussianBlur(cv2.dilate(P, np.ones((9, 9), np.uint8)), (0, 0), 2)
D = np.clip(paper - P, 0, 1)[y0:y1, x0:x1]
sk = skeletonize(D > thr).astype(np.uint8)
nbc = cv2.filter2D(sk, -1, np.ones((3, 3), np.float32)) * sk
sk[nbc >= 4] = 0   # break the skeleton at junctions
if '--mask' in sys.argv:
    mm = ringmask(jsdata(sys.argv[sys.argv.index('--mask') + 1].split(':')[0])[sys.argv[sys.argv.index('--mask') + 1].split(':')[1]])
    sk &= cv2.erode(mm, np.ones((13, 13), np.uint8))[y0:y1, x0:x1]
sk = sk > 0
lab = label(sk, connectivity=2)
im = (255 - np.clip(D / 0.5, 0, 1) * 255).astype(np.uint8); c = cv2.cvtColor(cv2.resize(im, None, fx=sc, fy=sc), cv2.COLOR_GRAY2BGR)
k = 0
rng = np.random.default_rng(1)
for rp in sorted(regionprops(lab), key=lambda r: -r.area):
    if rp.area < mn: continue
    cc = rp.coords  # (y, x)
    # end points: skeleton pixels with one neighbour; fall back to extreme points along the main axis
    m = np.zeros_like(sk, np.uint8); m[cc[:, 0], cc[:, 1]] = 1
    nb = cv2.filter2D(m, -1, np.ones((3, 3), np.float32)) * m
    ends = np.argwhere(nb == 2)
    if len(ends) < 2:
        v = cc - cc.mean(0); u = np.linalg.svd(v, full_matrices=False)[2][0]; pr = v @ u; ends = np.array([cc[pr.argmin()], cc[pr.argmax()]])
    # the two ends farthest apart
    dd = np.hypot(*(ends[:, None, :] - ends[None, :, :]).transpose(2, 0, 1)); i, j = np.unravel_index(dd.argmax(), dd.shape)
    a, b = ends[i], ends[j]
    col = tuple(int(v) for v in rng.integers(0, 200, 3))
    for (yy, xx) in cc: cv2.circle(c, (int(xx * sc), int(yy * sc)), 1, col, -1)
    cv2.putText(c, str(k), (int(a[1] * sc), int(a[0] * sc)), 0, 0.45, (0, 0, 255), 1)
    print(f'{k}: {a[1] + x0},{a[0] + y0},{b[1] + x0},{b[0] + y0}  len {rp.area}')
    k += 1
cv2.imwrite(out, c)
