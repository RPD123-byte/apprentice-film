# crop.py DIR N x0 y0 x1 y1 SCALE out.jpg [DIR2] : render | source (| DIR2) crop of frame N, scaled
import sys, cv2, numpy as np
d, n, x0, y0, x1, y1, s, out = sys.argv[1], int(sys.argv[2]), *map(int, sys.argv[3:7]), float(sys.argv[7]), sys.argv[8]
S = '/Users/computer/rootline/apprentice-film/snapshots/s07-bt/src'
ims = [cv2.imread(f'{d}/r{n:04d}.png'), cv2.imread(f'{S}/n{n:04d}.png')]
if len(sys.argv) > 9: ims.insert(1, cv2.imread(f'{sys.argv[9]}/r{n:04d}.png'))
cs = [cv2.resize(im[y0:y1, x0:x1], None, fx=s, fy=s, interpolation=cv2.INTER_NEAREST if s >= 3 else cv2.INTER_CUBIC) for im in ims]
w = cs[0].shape[1]
if w * len(cs) > 2400: o = np.vstack([np.vstack([c, np.full((4, w, 3), 255, np.uint8)]) for c in cs])
else: o = np.hstack([np.hstack([c, np.full((c.shape[0], 4, 3), 255, np.uint8)]) for c in cs])
cv2.imwrite(out, o, [cv2.IMWRITE_JPEG_QUALITY, 92])
