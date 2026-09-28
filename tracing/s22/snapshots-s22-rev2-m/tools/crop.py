# usage: crop.py dir idx x0 y0 x1 y1 out [scale] [--side]
import cv2, glob, sys, numpy as np
d, idx = sys.argv[1], sys.argv[2]
x0,y0,x1,y1 = map(int, sys.argv[3:7]); out = sys.argv[7]
sc = float(sys.argv[8]) if len(sys.argv)>8 and not sys.argv[8].startswith('--') else 1.0
side = '--side' in sys.argv
f = sorted(glob.glob(f'{d}/frame-{idx}-*.png'))[0]; r = sorted(glob.glob(f'{d}/ref-{idx}-*.png'))[0]
A = cv2.imread(f)[y0:y1, x0:x1]; B = cv2.imread(r)[y0:y1, x0:x1]
if sc != 1: A = cv2.resize(A, None, fx=sc, fy=sc, interpolation=cv2.INTER_NEAREST if sc>1 else cv2.INTER_AREA); B = cv2.resize(B, None, fx=sc, fy=sc, interpolation=cv2.INTER_NEAREST if sc>1 else cv2.INTER_AREA)
sep = np.full((6, A.shape[1], 3), (0,0,255), np.uint8) if not side else np.full((A.shape[0], 6, 3), (0,0,255), np.uint8)
im = np.vstack([A, sep, B]) if not side else np.hstack([A, sep, B])
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 92]); print(f, r, im.shape)
