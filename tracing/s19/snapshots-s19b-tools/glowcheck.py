# signed error (render - source, graded, unblurred) in bands at distance d outside / inside the standing card
import sys; sys.path.insert(0, '.')
from lab import *
import numpy as np, cv2
t = float(sys.argv[1]) if len(sys.argv) > 1 else 57.40
L = Lab(); r = cv2.cvtColor(L.render(t), cv2.COLOR_BGR2GRAY).astype(np.float32); L.close()
s = src(t, True).astype(np.float32)
q = np.array([[1093.2, 86.9], [1578.4, 50.7], [1686.5, 802.5], [995.7, 774.1]], np.float32)
m = np.zeros(r.shape, np.uint8); cv2.fillPoly(m, [np.round(q).astype(np.int32)], 1)
dout = cv2.distanceTransform(1 - m, cv2.DIST_L2, 5); din = cv2.distanceTransform(m, cv2.DIST_L2, 5)
side = {'top': lambda yy, xx: yy < 300, 'left': lambda yy, xx: (xx < 1200) & (yy > 150) & (yy < 760), 'right': lambda yy, xx: (xx > 1500) & (yy > 150) & (yy < 760)}
yy, xx = np.mgrid[0:946, 0:2206]
for nm, f in side.items():
    sel = f(yy, xx)
    row = []
    for d0, d1 in [(0, 5), (5, 12), (12, 25), (25, 45), (45, 70), (70, 100), (100, 150)]:
        b = sel & (dout > d0) & (dout <= d1)
        row.append(f'{d0}-{d1}: {(r - s)[b].mean():+6.1f} ({s[b].mean():5.1f})')
    print(nm, ' | '.join(row))
for d0, d1 in [(0, 4), (4, 10), (10, 20), (20, 40)]:
    b = (din > d0) & (din <= d1)
    print('inside', d0, d1, f'{(r - s)[b].mean():+6.1f} ({s[b].mean():5.1f})')
