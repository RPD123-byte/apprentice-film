# crop.py renderdir n x0 y0 x1 y1 out.jpg [scale] : render | source crop side by side (graded both)
import sys, numpy as np, cv2
SRC='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18r4/src/'
d, n = sys.argv[1], int(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7]); out = sys.argv[7]
sc = float(sys.argv[8]) if len(sys.argv) > 8 else 1
R = cv2.imread(f'{d}/r{n}.png')[y0:y1, x0:x1]; S = cv2.imread(f'{SRC}f{n:04d}.png')[y0:y1, x0:x1]
im = np.vstack([R, np.full((4, R.shape[1], 3), (0, 0, 255), np.uint8), S]) if (x1-x0) > 1.6*(y1-y0) else np.hstack([R, np.full((R.shape[0], 4, 3), (0, 0, 255), np.uint8), S])
if sc != 1: im = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC if sc > 1 else cv2.INTER_AREA)
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 90])
