# crop.py render.png source.png x0 y0 x1 y1 zoom out.jpg  -> render | source crops side by side, upscaled (nearest)
import cv2, numpy as np, sys
R, S = cv2.imread(sys.argv[1]), cv2.imread(sys.argv[2])
x0, y0, x1, y1 = map(int, sys.argv[3:7]); z = float(sys.argv[7])
a, b = R[y0:y1, x0:x1], S[y0:y1, x0:x1]
f = lambda im: cv2.resize(im, None, fx=z, fy=z, interpolation=cv2.INTER_NEAREST if z >= 2 else cv2.INTER_AREA)
A, Bb = f(a), f(b); sep = np.full((A.shape[0], 6, 3), (0, 0, 200), np.uint8)
cv2.imwrite(sys.argv[8], np.hstack([A, sep, Bb]), [cv2.IMWRITE_JPEG_QUALITY, 92])
