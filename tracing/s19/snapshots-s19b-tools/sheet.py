# sheet.py out.jpg t1,t2,... [w]: render|source pairs (side by side) stacked, each pair w px wide
import sys; sys.path.insert(0, '.')
from lab import *
out = sys.argv[1]; ts = [float(v) for v in sys.argv[2].split(',')]; w = int(sys.argv[3]) if len(sys.argv) > 3 else 1400
L = Lab(); rows = []
for t in ts:
    r = L.render(t); s = src(t)
    p = np.hstack([r, np.full((946, 8, 3), 255, np.uint8), s]); p = cv2.resize(p, (w, int(w * 946 / p.shape[1])), interpolation=cv2.INTER_AREA)
    cv2.putText(p, f'{t:.2f}  {mae(r, s):.1f}', (6, 20), 0, 0.6, (0, 255, 255), 2); rows.append(p)
L.close()
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 85])
