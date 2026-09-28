import cv2, numpy as np, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s12/trace')
from degrade import degrade
img = sys.argv[1]; mode = sys.argv[2]
g = cv2.imread(img, 0).astype(np.float32)
t = float(sys.argv[3]) if len(sys.argv) > 3 else 34.0
p = cv2.GaussianBlur(degrade(g, t=t), (0, 0), 0.6)
for spec in sys.argv[4:]:
  a, b, c, d = map(int, spec.split(','))
  if mode == 'row':   # y, x0, x1, step
    print('y=%d' % a, ' '.join('%d:%d' % (x, p[a, x]) for x in range(b, c, d)))
  else:
    print('x=%d' % a, ' '.join('%d:%d' % (y, p[y, a]) for y in range(b, c, d)))
