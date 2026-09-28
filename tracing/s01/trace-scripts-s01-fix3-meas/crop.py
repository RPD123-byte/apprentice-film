# crop.py DIR IDX x0 y0 x1 y1 out.jpg [scale]  -> render crop | source crop (stacked horizontally, labelled)
import cv2, sys, glob, numpy as np
d, idx = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = map(int, sys.argv[3:7]); out = sys.argv[7]; sc = float(sys.argv[8]) if len(sys.argv) > 8 else 1.0
fr = cv2.imread(glob.glob(f"{d}/frame-{idx}-*.png")[0]); rf = cv2.imread(glob.glob(f"{d}/ref-{idx}-*.png")[0])
if rf.shape != fr.shape: rf = cv2.resize(rf, (fr.shape[1], fr.shape[0]))
a = fr[y0:y1, x0:x1]; b = rf[y0:y1, x0:x1]
im = np.hstack([a, np.full((a.shape[0], 6, 3), 80, np.uint8), b])
if sc != 1: im = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC if sc > 1 else cv2.INTER_AREA)
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 90])
ga = cv2.cvtColor(a, cv2.COLOR_BGR2GRAY).astype(float); gb = cv2.cvtColor(b, cv2.COLOR_BGR2GRAY).astype(float)
print("mean render %.1f source %.1f  blurMAE %.1f" % (ga.mean(), gb.mean(), np.abs(cv2.GaussianBlur(ga,(0,0),6)-cv2.GaussianBlur(gb,(0,0),6)).mean()))
