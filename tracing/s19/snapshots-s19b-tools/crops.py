# crops.py out.jpg "t1,t2,.." x0,y0,x1,y1 [scale] [--track ball]: render|source crops stacked per time (columns = times)
import sys; sys.path.insert(0, '.')
from lab import *
import numpy as np, cv2
out = sys.argv[1]; ts = [float(v) for v in sys.argv[2].split(',')]; box = [int(v) for v in sys.argv[3].split(',')]
sc = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
L = Lab(); cols = []
for t in ts:
    r = L.render(t); s = src(t); x0, y0, x1, y1 = box
    a = r[y0:y1, x0:x1]; b = s[y0:y1, x0:x1]
    col = np.vstack([a, np.full((4, a.shape[1], 3), 255, np.uint8), b])
    cv2.putText(col, f'{t:.2f} {mae(r, s, 8, box):.1f}', (4, 16), 0, 0.5, (0, 255, 255), 1)
    cols.append(col); cols.append(np.full((col.shape[0], 4, 3), 255, np.uint8))
L.close()
im = np.hstack(cols[:-1])
if sc != 1: im = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 90])
