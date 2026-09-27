# pair.py DIR T x0 y0 x1 y1 scale out  -> render | source side by side (from compare.sh output)
import cv2, sys, numpy as np, glob
d, t = sys.argv[1], sys.argv[2]; x0, y0, x1, y1 = map(int, sys.argv[3:7]); sc = float(sys.argv[7]); out = sys.argv[8]
f = [p for p in glob.glob(d + '/frame-*.png') if f'at-{t}s' in p][0]
a = cv2.imread(f)[y0:y1, x0:x1]; b = cv2.imread(f.replace('frame-', 'ref-'))[y0:y1, x0:x1]
im = np.hstack([a, np.zeros((a.shape[0], 6, 3), np.uint8), b])
im = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_NEAREST if sc >= 2 else cv2.INTER_AREA)
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 90])
