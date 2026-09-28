# top/bottom view: render (top) over source (bottom), optional crop x0 y0 x1 y1 and scale
import cv2, sys, glob, numpy as np
d, t, out = sys.argv[1], sys.argv[2], sys.argv[3]
crop = [int(v) for v in sys.argv[4:8]] if len(sys.argv) >= 8 else None
sc = float(sys.argv[8]) if len(sys.argv) >= 9 else 0.5
a = cv2.imread(glob.glob(f'{d}/frame-*-at-{t}s.png')[0]); b = cv2.imread(glob.glob(f'{d}/ref-*-at-{t}s.png')[0])
if crop: a = a[crop[1]:crop[3], crop[0]:crop[2]]; b = b[crop[1]:crop[3], crop[0]:crop[2]]
a = cv2.resize(a, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA); b = cv2.resize(b, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
cv2.putText(a, 'R ' + t, (8, 24), 0, 0.8, (0, 255, 255), 2); cv2.putText(b, 'S ' + t, (8, 24), 0, 0.8, (0, 255, 255), 2)
cv2.imwrite(out, np.vstack([a, np.full((4, a.shape[1], 3), 255, np.uint8), b]), [cv2.IMWRITE_JPEG_QUALITY, 92])
