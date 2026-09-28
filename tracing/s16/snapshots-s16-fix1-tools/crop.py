# crop.py RENDERDIR n x0 y0 x1 y1 scale out.jpg  -> render | source crop, scaled
import sys, cv2, numpy as np; sys.path.insert(0, '.')
import h16
d, n = sys.argv[1], int(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7]); s = float(sys.argv[7]); out = sys.argv[8]
r = cv2.imread(f'{d}/r{n}.png')[y0:y1, x0:x1]; b = h16.src(n)[y0:y1, x0:x1]
im = np.hstack([r, np.full((y1 - y0, 4, 3), (0, 0, 255), np.uint8), b])
im = cv2.resize(im, None, fx=s, fy=s, interpolation=cv2.INTER_CUBIC if s > 1 else cv2.INTER_AREA)
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 92])
