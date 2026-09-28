# ovl.py FRAMES x0,y0,x1,y1 scale out.jpg SHAPES.json : draw candidate control-point shapes over the source crop
# SHAPES: {"poly": [[[x,y],...], ...], "ell": [[cx,cy,rx,ry,rot], ...], "pts": [[x,y],...]}
import sys, json, numpy as np, cv2
from common import *
fr = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2].split(',')); sc = float(sys.argv[3]); out = sys.argv[4]; Sh = json.loads(open(sys.argv[5]).read() if sys.argv[5].endswith('.json') else sys.argv[5])
I = src(fr) if '-' in fr or fr.isdigit() else cv2.imread(fr, 0).astype(np.float32)
c = cv2.cvtColor(cv2.resize(np.clip(I[y0:y1, x0:x1], 0, 255).astype(np.uint8), None, fx=sc, fy=sc, interpolation=cv2.INTER_LINEAR), cv2.COLOR_GRAY2BGR)
T = lambda p: (int(round((p[0] - x0) * sc)), int(round((p[1] - y0) * sc)))
cols = [(0, 0, 255), (0, 200, 0), (255, 0, 0), (0, 200, 255), (255, 0, 255), (255, 255, 0)]
for i, P in enumerate(Sh.get('poly', [])):
    cv2.polylines(c, [np.array([T(p) for p in P], np.int32).reshape(-1, 1, 2)], False, cols[i % 6], 1)
for i, E in enumerate(Sh.get('ell', [])):
    a = np.linspace(0, 2 * np.pi, 120); cx, cy, rx, ry, rot = E
    pts = [T((cx + rx * np.cos(t) * np.cos(rot) - ry * np.sin(t) * np.sin(rot), cy + rx * np.cos(t) * np.sin(rot) + ry * np.sin(t) * np.cos(rot))) for t in a]
    cv2.polylines(c, [np.array(pts, np.int32).reshape(-1, 1, 2)], True, cols[(i + 2) % 6], 1)
for p in Sh.get('pts', []): cv2.circle(c, T(p), 3, (0, 0, 255), 1)
for x in range((x0 // 10 + 1) * 10, x1, 10):
    X = int((x - x0) * sc); cv2.line(c, (X, 0), (X, 4 if x % 50 else 10), (0, 255, 255), 1)
    if x % 50 == 0: cv2.putText(c, str(x), (X + 2, 20), 0, 0.4, (0, 255, 255), 1)
for y in range((y0 // 10 + 1) * 10, y1, 10):
    Y = int((y - y0) * sc); cv2.line(c, (0, Y), (4 if y % 50 else 10, Y), (0, 255, 255), 1)
    if y % 50 == 0: cv2.putText(c, str(y), (12, Y + 4), 0, 0.4, (0, 255, 255), 1)
cv2.imwrite(out, c)
