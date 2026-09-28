import cv2, numpy as np, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s12/trace')
from degrade import degrade
g = cv2.imread('src-850.png', 0).astype(np.float32)
p = cv2.GaussianBlur(degrade(g), (0, 0), 1.0)
cx, cy, rx, ry = 1381, 277, 37, 73
# per angle: scan outward from 0.7 to 1.45 of the interior ellipse radius, find the dark run after the halftone
out = []
for a in range(0, 360, 10):
  t = np.radians(a); prof = []
  for s in np.arange(0.8, 1.5, 0.01):
    x, y = cx + rx * s * np.cos(t), cy + ry * s * np.sin(t)
    prof.append(p[int(round(y)), int(round(x))])
  prof = np.array(prof); ss = np.arange(0.8, 1.5, 0.01)
  # darkest smoothed point
  sm = np.convolve(prof, np.ones(3) / 3, 'same'); i = int(np.argmin(sm[2:-2])) + 2
  dark = ss[(sm < 60)]
  out.append((a, round(ss[i], 2), int(sm[i]), (round(dark.min(), 2), round(dark.max(), 2)) if len(dark) else None))
for o in out: print(o)
