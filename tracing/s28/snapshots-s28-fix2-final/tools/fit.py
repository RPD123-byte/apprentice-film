# s28 fix2: MEASURE a coarse outline (<= maxv vertices) of a region class in a source frame (numbers only, for drawing
# by hand on top). crit: dark:THR | skin | hood | light:THR. Pixels of the class inside a hand-placed region, closed/opened,
# largest component (or all >= min area with --all), outer contour, simplified.
# Usage: fit.py T "x,y x,y ..." crit close maxv [out.jpg] [--all]
import sys, cv2, numpy as np, json
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28d-tools')
from lib import src
args = [a for a in sys.argv[1:] if not a.startswith('--')]; allc = '--all' in sys.argv
t = float(args[0]); reg = np.array([[int(v) for v in p.split(',')] for p in args[1].split()], np.int32)
crit, kc, maxv = args[2], int(args[3]), int(args[4]); out = args[5] if len(args) > 5 else None
f = src(t); sm = cv2.bilateralFilter(f, 9, 30, 5)
g = cv2.cvtColor(sm, cv2.COLOR_BGR2GRAY).astype(np.int32)
lab = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB).astype(np.int32); L, A, B = lab[..., 0] * 100 // 255, lab[..., 1] - 128, lab[..., 2] - 128
R = np.zeros(g.shape, np.uint8); cv2.fillPoly(R, [reg], 1)
if crit.startswith('dark'): m = g < int(crit.split(':')[1])
elif crit.startswith('light'): m = g > int(crit.split(':')[1])
elif crit == 'skin': m = (A > 9) & (L > 45)
elif crit == 'hood': m = (A < 2) & (L > 35) & (L < 85)
m = (m & (R > 0)).astype(np.uint8)
k = lambda n: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))
m = cv2.morphologyEx(cv2.morphologyEx(m, cv2.MORPH_CLOSE, k(kc)), cv2.MORPH_OPEN, k(5)) & R
n, lab2, st, _ = cv2.connectedComponentsWithStats(m)
res = []
idx = [1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))] if not allc else [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > 300]
o = (f * 0.5).astype(np.uint8); o[m > 0] = (o[m > 0] * 0.5 + np.array([0, 0, 120])).astype(np.uint8)
for i in idx:
    mm = cv2.GaussianBlur((lab2 == i).astype(np.float32), (0, 0), 2) > 0.5
    cs, _ = cv2.findContours(mm.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); c = max(cs, key=cv2.contourArea)
    eps = 1.0
    while True:
        a = cv2.approxPolyDP(c, eps, True)
        if len(a) <= maxv: break
        eps *= 1.15
    M = [[int(p[0][0]), int(p[0][1])] for p in a]; res.append(M)
    cv2.polylines(o, [np.array(M)], True, (0, 255, 0), 2)
print(json.dumps(res if allc else res[0]))
if out:
    cv2.polylines(o, [reg], True, (255, 255, 0), 1)
    x0, y0, w0, h0 = cv2.boundingRect(reg); cv2.imwrite(out, cv2.resize(o[y0:y0 + h0, x0:x0 + w0], None, fx=1.3, fy=1.3))
