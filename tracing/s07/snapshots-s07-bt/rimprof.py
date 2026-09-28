# rimprof.py RENDER.png : profile of the screen's left edge (BL -> TL) in source mean and render; peak offset/value/FWHM
import sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s07/trace')
import grade
S = 's07-bt/src'
acc = np.zeros((946, 2206), np.float64)
for n in range(727, 764): acc += cv2.imread(f'{S}/n{n:04d}.png', 0)
src = (acc / 37).astype(np.float32)
pre = grade.inverse(src / 255, 29.8) * 255
ren = cv2.imread(sys.argv[1], 0).astype(np.float32)
Q = [(315, 246), (834, 168), (898, 519), (409, 648)]
edges = {'left': (Q[3], Q[0]), 'bottom': (Q[2], Q[3])}
def samp(im, x, y): return cv2.getRectSubPix(im, (1, 1), (float(x), float(y)))[0, 0]
for nm, (a, b) in edges.items():
  a = np.array(a, float); b = np.array(b, float); L = np.linalg.norm(b - a); d = (b - a) / L; n = np.array([-d[1], d[0]])
  print(nm, 'normal', n.round(3))
  for t in np.arange(0, 1.001, 0.05):
    p = a + (b - a) * t; offs = np.arange(-6, 8.01, 0.5)
    out = []
    for im in (src, ren, pre):
      v = np.array([samp(im, *(p + n * o)) for o in offs]); i = v.argmax(); pk = v[i]
      base = np.median(np.r_[v[:4], v[-4:]]); half = base + (pk - base) / 2
      w = (v > half).sum() * 0.5
      out.append((offs[i], pk, w))
    print('  t%.2f  src off %+.1f v %3.0f w %.1f | ren off %+.1f v %3.0f w %.1f | pre-src v %3.0f' % (t, *out[0], *out[1], out[2][1]))
