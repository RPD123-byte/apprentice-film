# source hood left/back contour at time t (frame px): strict hood-colour mask, largest component touching the lid side,
# boundary points sampled every ~25 px of arc on the left/top side. Usage: srccont.py T xlid out.jpg
import cv2, numpy as np, sys, json
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28d-tools')
from lib import src
t = float(sys.argv[1]); xl = int(sys.argv[2]); out = sys.argv[3]
f = src(t); sm = cv2.bilateralFilter(f, 9, 30, 5); lab = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB).astype(int)
L, A, B = lab[..., 0] * 100 // 255, lab[..., 1] - 128, lab[..., 2] - 128
m = ((A < -1) & (L > 30) & (L < 82) & (B < 18)).astype(np.uint8)
m[:, xl:] = 0; m[:200] = 0; m[860:] = 0
m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)); m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
n, lb, st, _ = cv2.connectedComponentsWithStats(m)
k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])); m = (lb == k).astype(np.uint8)
cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); c = max(cs, key=cv2.contourArea)[:, 0, :]
# keep boundary points not on the lid side / frame edges
keep = [(int(x), int(y)) for x, y in c if x < xl - 12 and y > 205 and y < 855]
# resample every 25 px of arc
pts = [keep[0]]
for p in keep[1:]:
    if np.hypot(p[0] - pts[-1][0], p[1] - pts[-1][1]) >= 25: pts.append(p)
print(json.dumps(pts))
o = f.copy(); o[m > 0] = (o[m > 0] * 0.6 + np.array([0, 0, 90])).astype(np.uint8)
for p in pts: cv2.circle(o, p, 5, (0, 255, 0), -1)
cv2.imwrite(out, cv2.resize(o[150:900, 100:900], None, fx=0.6, fy=0.6))
