# Measure the room card's layout (text box, button line, divider, smiley, trash) in card units on 57.36, with the
# paper-edge static quad: the darkest point across each keyline, back-projected to card units.
import numpy as np, cv2
from common import frame
g = np.mean([frame(1433), frame(1434)], 0)
b = cv2.GaussianBlur(g, (0, 0), 1.0).astype(np.float32)
CW, CH = 465, 648
C = np.float32([[0, 0], [CW, 0], [CW, CH], [0, CH]])
QS = np.float32([[1093.2, 86.9], [1578.4, 50.7], [1686.5, 802.5], [995.7, 774.1]])
H = cv2.getPerspectiveTransform(C, QS); Hi = np.linalg.inv(H)
P = lambda u, v: cv2.perspectiveTransform(np.float32([[[u, v]]]), H)[0, 0]
B = lambda x, y: cv2.perspectiveTransform(np.float32([[[x, y]]]), Hi)[0, 0]
def side(pts, nrm, key):
    vals = []
    for (u, v) in pts:
        p = P(u, v); q = P(u + nrm[0], v + nrm[1]); n = (q - p) / np.linalg.norm(q - p)
        ss = np.arange(-15, 15.1, 0.25); xs = p[0] + n[0] * ss; ys = p[1] + n[1] * ss
        prof = cv2.remap(b, xs.astype(np.float32).reshape(1, -1), ys.astype(np.float32).reshape(1, -1), cv2.INTER_LINEAR)[0]
        i = int(np.argmin(prof)); vals.append(B(xs[i], ys[i])[key])
    return round(float(np.median(vals)), 1)
x0 = side([(51, v) for v in range(220, 500, 20)], (1, 0), 0)
x1 = side([(423, v) for v in range(220, 500, 20)], (1, 0), 0)
y0 = side([(u, 160) for u in range(100, 380, 20)], (0, 1), 1)
by = side([(u, 532.5) for u in list(range(80, 220, 15)) + list(range(260, 400, 15))], (0, 1), 1)
y1 = side([(u, 600.5) for u in list(range(80, 220, 15)) + list(range(260, 400, 15))], (0, 1), 1)
dx = side([(237, v) for v in range(548, 590, 4)], (1, 0), 0)
print(dict(x0=x0, y0=y0, x1=x1, y1=y1, btnY=by, divX=dx))
# smiley: brightest-yellow centroid (colour frame)
s = frame(1434, gray=False).astype(float)
yel = (s[:, :, 2] - s[:, :, 0])
m = (yel > 60).astype(np.uint8)
n, lab, st, cen = cv2.connectedComponentsWithStats(m)
k = 1 + np.argmax(st[1:, 4]); cx, cy = cen[k]
print('smiley centre frame', np.round([cx, cy], 1), 'card', np.round(B(cx, cy), 1), 'area px', st[k, 4], 'r~', round(float(np.sqrt(st[k, 4] / np.pi)), 1))
