# colour source crop with a fine labelled grid (measuring only). Usage: cgrid.py T x0 y0 x1 y1 out.jpg [step] [scale] [render.png]
import sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28d-tools')
from lib import src
t = float(sys.argv[1]); x0, y0, x1, y1 = map(int, sys.argv[2:6]); out = sys.argv[6]
step = int(sys.argv[7]) if len(sys.argv) > 7 else 20; sc = float(sys.argv[8]) if len(sys.argv) > 8 else 2
f = (cv2.imread(sys.argv[9]) if len(sys.argv) > 9 else src(t))[y0:y1, x0:x1]
o = cv2.resize(f, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
for x in range((x0 // step + 1) * step, x1, step):
    X = int((x - x0) * sc); c = (0, 0, 255) if x % 100 == 0 else (0, 200, 255)
    cv2.line(o, (X, 0), (X, o.shape[0]), c, 1)
    if x % (step * 2) == 0: cv2.putText(o, str(x), (X + 2, 12), 0, 0.42, (255, 60, 0), 1)
for y in range((y0 // step + 1) * step, y1, step):
    Y = int((y - y0) * sc); c = (0, 0, 255) if y % 100 == 0 else (0, 200, 255)
    cv2.line(o, (0, Y), (o.shape[1], Y), c, 1)
    if y % (step * 2) == 0: cv2.putText(o, str(y), (2, Y - 2), 0, 0.42, (255, 60, 0), 1)
cv2.imwrite(out, o, [cv2.IMWRITE_JPEG_QUALITY, 88])
