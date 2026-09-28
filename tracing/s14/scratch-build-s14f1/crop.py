# crop.py DIR T x0 y0 x1 y1 out.jpg [scale]  -> render | source crop side by side
import cv2, sys, glob, numpy as np
d, t = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = map(int, sys.argv[3:7]); out = sys.argv[7]; sc = float(sys.argv[8]) if len(sys.argv) > 8 else 1
def find(pref):
    for p in glob.glob(f"{d}/{pref}-*-at-*s.png"):
        tt = float(p.split('-at-')[1][:-5])
        if abs(tt - float(t)) < 1e-3: return p
    raise SystemExit('missing ' + pref + t)
a = cv2.imread(find('frame'))[y0:y1, x0:x1]; b = cv2.imread(find('ref'))[y0:y1, x0:x1]
if sc != 1:
    a = cv2.resize(a, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC); b = cv2.resize(b, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC)
sep = np.full((a.shape[0], 6, 3), (0, 0, 255), np.uint8)
cv2.imwrite(out, np.hstack([a, sep, b]), [cv2.IMWRITE_JPEG_QUALITY, 90])
