# ovl.py out.jpg "t1,t2,..." x0,y0,x1,y1 [scale]: the owl's rendered silhouette outline (red) over the source frame
import sys; sys.path.insert(0, '.')
from lab import *
import numpy as np, cv2
out = sys.argv[1]; ts = [float(v) for v in sys.argv[2].split(',')]; x0, y0, x1, y1 = [int(v) for v in sys.argv[3].split(',')]
sc = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
L = Lab(); cols = []
for t in ts:
    o = L.devc('owlc', {'t': t}); a = o[:, :, 3] if o.shape[2] == 4 else np.zeros(o.shape[:2], np.uint8)
    m = (a > 100).astype(np.uint8)
    s = src(t).copy()
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(s, cs, -1, (0, 0, 255), 2)
    c = s[y0:y1, x0:x1].copy(); cv2.putText(c, f'{t:.2f}', (4, 18), 0, 0.6, (0, 255, 255), 2)
    cols.append(c); cols.append(np.full((c.shape[0], 4, 3), 255, np.uint8))
L.close()
im = np.hstack(cols[:-1])
if sc != 1: im = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 90])
