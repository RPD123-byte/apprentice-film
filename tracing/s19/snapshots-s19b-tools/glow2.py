# glow2.py t: signed error (render - source, graded) in distance bands outside the card quad at time t (table from card.js)
import sys, re; sys.path.insert(0, '.')
from lab import *
t = float(sys.argv[1])
txt = open('../../src/shots/s19/card.js').read()
rows = [[float(v) for v in m.group(1).split(',')] for m in re.finditer(r'^\s*\[(\d\d\.\d\d,[^\]]*)\]', txt, re.M)]
row = min(rows, key=lambda r: abs(r[0] - t))
q = np.array([[row[1], row[2]], [row[3], row[4]], [row[13], row[14]], [row[15], row[16]]], np.float32)
L = Lab(); r = cv2.cvtColor(L.render(t), cv2.COLOR_BGR2GRAY).astype(np.float32); o = L.devc('owlc', {'t': t}); L.close()
s = src(t, True).astype(np.float32)
m = np.zeros(r.shape, np.uint8); cv2.fillPoly(m, [np.round(q).astype(np.int32)], 1)
owl = cv2.dilate((o[:, :, 3] > 30).astype(np.uint8), np.ones((41, 41), np.uint8)).astype(bool)
dout = cv2.distanceTransform(1 - m, cv2.DIST_L2, 5)
for d0, d1 in [(0, 5), (5, 12), (12, 25), (25, 45), (45, 70), (70, 100), (100, 150), (150, 250)]:
    b = (dout > d0) & (dout <= d1) & ~owl & (np.arange(946)[:, None] < 780)
    print(f'{d0:3d}-{d1:3d}: diff {(r - s)[b].mean():+6.1f}  src {s[b].mean():6.1f}  n {b.sum()}')
