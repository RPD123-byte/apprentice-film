# s28 fix1: MEASURE a coarse outline (<= N vertices) of a dark region of a source frame: dark pixels inside a hand-placed
# region, bridged by a morphological close (so strands and the gaps between them become one mass), outer contour only.
# Usage: massfit.py T "x,y x,y ..." thr close maxv [out.jpg]
import sys, cv2, numpy as np, json
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28d-tools')
from lib import src
t = float(sys.argv[1]); reg = np.array([[int(v) for v in p.split(',')] for p in sys.argv[2].split()], np.int32)
thr, kc, maxv = int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]); out = sys.argv[6] if len(sys.argv) > 6 else None
f = src(t); g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
R = np.zeros(g.shape, np.uint8); cv2.fillPoly(R, [reg], 1)
k = lambda n: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))
dark = ((g < thr) & (R > 0)).astype(np.uint8)
m = cv2.morphologyEx(cv2.morphologyEx(dark, cv2.MORPH_CLOSE, k(kc)), cv2.MORPH_OPEN, k(7)) & R
n, lab, st, _ = cv2.connectedComponentsWithStats(m)
m = (lab == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
m = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 2) > 0.5
cs, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); c = max(cs, key=cv2.contourArea)
eps = 1.0
while True:
    a = cv2.approxPolyDP(c, eps, True)
    if len(a) <= maxv: break
    eps *= 1.15
M = [[int(p[0][0]), int(p[0][1])] for p in a]
print(json.dumps(M)); print(f'# {len(M)} vertices, eps {eps:.1f}', file=sys.stderr)
if out:
    o = (f * 0.5).astype(np.uint8); o[dark > 0] = (0, 0, 160)
    cv2.polylines(o, [np.array(M)], True, (0, 255, 0), 2); cv2.polylines(o, [reg], True, (255, 255, 0), 1)
    x0, y0, w0, h0 = cv2.boundingRect(reg); cv2.imwrite(out, cv2.resize(o[y0:y0 + h0, x0:x0 + w0], None, fx=1.4, fy=1.4))
