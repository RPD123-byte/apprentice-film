# usage: crop.py OUT.jpg SCALE x0 y0 x1 y1 T1 [T2 ...]   (times exact n/25; looks for frame in s17-rev2-{a,b,c,x*})
import cv2, numpy as np, glob, sys
P = '/Users/computer/rootline/apprentice-film/snapshots/'
out, sc = sys.argv[1], float(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7]); ts = sys.argv[7:]
def find(t, kind):
    tt = ('%.2f' % float(t)).rstrip('0').rstrip('.')
    for d in sorted(glob.glob(P + 's17-rev2-*')):
        g = glob.glob(d + '/%s-*-at-%ss.png' % (kind, tt))
        if g: return cv2.imread(g[0])
    return None
rows = []
for t in ts:
    r, s = find(t, 'frame'), find(t, 'ref')
    if r is None or s is None: print('missing', t); continue
    a = cv2.resize(r[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
    b = cv2.resize(s[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
    sep = np.full((a.shape[0], 6, 3), (0, 0, 255), np.uint8)
    row = np.hstack([a, sep, b])
    cv2.putText(row, t, (6, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
    rows.append(row)
    rows.append(np.full((4, row.shape[1], 3), (0, 0, 255), np.uint8))
cv2.imwrite(out, np.vstack(rows[:-1]), [cv2.IMWRITE_JPEG_QUALITY, 90])
print('wrote', out)
