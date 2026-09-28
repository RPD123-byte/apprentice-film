# dark-mask comparison: source-only dark = red, render-only dark = green, both = black; grid. (measuring only)
# Usage: dkcmp.py render.png T x0 y0 x1 y1 out.jpg [thr] [step] [scale]
import sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28d-tools')
from lib import src
r = cv2.imread(sys.argv[1]); t = float(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7]); out = sys.argv[7]
thr = int(sys.argv[8]) if len(sys.argv) > 8 else 45; step = int(sys.argv[9]) if len(sys.argv) > 9 else 20; sc = float(sys.argv[10]) if len(sys.argv) > 10 else 1.6
s = src(t)
gr = cv2.cvtColor(r, cv2.COLOR_BGR2GRAY)[y0:y1, x0:x1] < thr; gs = cv2.cvtColor(s, cv2.COLOR_BGR2GRAY)[y0:y1, x0:x1] < thr
o = np.full(gr.shape + (3,), 235, np.uint8)
o[gs & ~gr] = (60, 60, 230); o[gr & ~gs] = (60, 200, 60); o[gr & gs] = (20, 20, 20)
o = cv2.resize(o, None, fx=sc, fy=sc, interpolation=cv2.INTER_NEAREST)
for x in range((x0 // step + 1) * step, x1, step):
    X = int((x - x0) * sc); cv2.line(o, (X, 0), (X, o.shape[0]), (0, 0, 255) if x % 100 == 0 else (0, 200, 255), 1)
    if x % (step * 2) == 0: cv2.putText(o, str(x), (X + 2, 12), 0, 0.42, (255, 60, 0), 1)
for y in range((y0 // step + 1) * step, y1, step):
    Y = int((y - y0) * sc); cv2.line(o, (0, Y), (o.shape[1], Y), (0, 0, 255) if y % 100 == 0 else (0, 200, 255), 1)
    if y % (step * 2) == 0: cv2.putText(o, str(y), (2, Y - 2), 0, 0.42, (255, 60, 0), 1)
cv2.imwrite(out, o)
print('source dark px', int(gs.sum()), 'render dark px', int(gr.sum()), 'IoU', round(float((gs & gr).sum() / max(1, (gs | gr).sum())), 3))
