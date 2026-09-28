# pair.py RENDER_DIR K OUT [x0 y0 x1 y1] [scale]  -> stacked render (top) / source (bottom) crop
import sys, cv2, numpy as np
SRC = "/Users/computer/rootline/apprentice-film/snapshots/end-s24-tfix-src"
rd, k, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
box = list(map(int, sys.argv[4:8])) if len(sys.argv) >= 8 else [0, 0, 2206, 946]
sc = float(sys.argv[8]) if len(sys.argv) >= 9 else 1.0
r = cv2.imread(f"{rd}/k{k:02d}.png"); s = cv2.imread(f"{SRC}/f{2420+k:04d}.png")
x0, y0, x1, y1 = box
a = r[y0:y1, x0:x1]; b = s[y0:y1, x0:x1]
if sc != 1: a = cv2.resize(a, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC); b = cv2.resize(b, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC)
horiz = (x1 - x0) < (y1 - y0) * 1.3
img = np.hstack([a, b]) if horiz else np.vstack([a, b])
cv2.imwrite(out, img, [cv2.IMWRITE_JPEG_QUALITY, 90])
