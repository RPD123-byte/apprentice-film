# usage: overlay.py OUT.jpg SCALE x0 y0 x1 y1 T1 [T2 ...]  -> red = render, cyan = source, per row: overlay | render | source
import cv2, numpy as np, glob, sys
P = '/Users/computer/rootline/apprentice-film/snapshots/'
out, sc = sys.argv[1], float(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7]); ts = sys.argv[7:]
def find(t, kind):
    tt = ('%.2f' % float(t)).rstrip('0').rstrip('.')
    for d in sorted(glob.glob(P + 's17-rev2-*')):
        g = glob.glob(d + '/%s-*-at-%ss.png' % (kind, tt))
        if g: return cv2.imread(g[0], 0)
    return None
rows = []
for t in ts:
    r, s = find(t, 'frame'), find(t, 'ref')
    a, b = r[y0:y1, x0:x1], s[y0:y1, x0:x1]
    ov = np.dstack([b, b, a])
    row = np.hstack([ov, cv2.cvtColor(a, cv2.COLOR_GRAY2BGR), cv2.cvtColor(b, cv2.COLOR_GRAY2BGR)])
    row = cv2.resize(row, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
    w = (x1 - x0) * sc
    for k in (1, 2): cv2.line(row, (int(k * w), 0), (int(k * w), row.shape[0]), (0, 255, 0), 2)
    cv2.putText(row, t, (6, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
    rows.append(row); rows.append(np.full((4, row.shape[1], 3), (0, 255, 0), np.uint8))
cv2.imwrite(out, np.vstack(rows[:-1]), [cv2.IMWRITE_JPEG_QUALITY, 90]); print('wrote', out)
