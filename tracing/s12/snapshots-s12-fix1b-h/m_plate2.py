import cv2, numpy as np, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s12/trace')
from degrade import degrade
g = cv2.imread('src-850.png', 0).astype(np.float32)
p = cv2.GaussianBlur(degrade(g), (0, 0), 2.0)   # blur out the halftone
cx, cy, rx, ry = 1381, 280, 40, 78
inner, outer = [], []
for a in range(0, 360, 5):
  t = np.radians(a); ss = np.arange(0.6, 1.5, 0.005)
  xs, ys = cx + rx * ss * np.cos(t), cy + ry * ss * np.sin(t)
  prof = np.array([p[int(round(y)), int(round(x))] for x, y in zip(xs, ys)])
  i = np.argmax(prof < 55)
  if prof[i] < 55: inner.append((xs[i], ys[i]))
  # outer edge of the dark run: next point > 90 after i
  j = i + np.argmax(prof[i:] > 90)
  if prof[j] > 90 and j > i: outer.append((a, xs[j], ys[j], round((j - i) * 0.005 * np.hypot(rx*np.sin(t), ry*np.cos(t)), 1)))
e = cv2.fitEllipse(np.array(inner, np.float32)); print('inner ellipse', e)
for o in outer: print(o[0], int(o[1]), int(o[2]), 'darkw', o[3])
