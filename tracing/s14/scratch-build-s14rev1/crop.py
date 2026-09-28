import cv2, sys, numpy as np
# usage: crop.py dir idx x0 y0 x1 y1 out [scale] [gain]
d, idx = sys.argv[1], sys.argv[2]
x0,y0,x1,y1 = map(int, sys.argv[3:7]); out=sys.argv[7]
sc = float(sys.argv[8]) if len(sys.argv)>8 else 1.0
gain = float(sys.argv[9]) if len(sys.argv)>9 else 1.0
import glob
f = glob.glob(f"{d}/frame-{idx}-*.png")[0]; r = glob.glob(f"{d}/ref-{idx}-*.png")[0]
a = cv2.imread(f)[y0:y1,x0:x1]; b = cv2.imread(r)[y0:y1,x0:x1]
a = np.clip(a.astype(np.float32)*gain,0,255).astype(np.uint8); b = np.clip(b.astype(np.float32)*gain,0,255).astype(np.uint8)
sep = np.full((a.shape[0], 6, 3), (0,0,255), np.uint8)
im = np.hstack([a, sep, b])
if sc != 1.0: im = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
cv2.imwrite(out, im)
print(f, r, im.shape)
