import sys; sys.path.insert(0, '.')
from lab import src
import numpy as np, cv2
bg = np.median(np.stack([src(57.32, True), src(57.36, True)]).astype(np.float32), 0)
bgb = cv2.GaussianBlur(bg, (0, 0), 2)
K = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (71, 71))
for k in range(1436, 1455):
    t = k / 25; f = cv2.GaussianBlur(src(t, True).astype(np.float32), (0, 0), 2)
    d = np.abs(f - bgb); m = (d > 30).astype(np.uint8)
    # the owl is bright: also require the frame to be bright (excludes the dark shadow)
    m &= (f > 120).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, K)
    n, lab, st, cen = cv2.connectedComponentsWithStats(m)
    if n < 2: print(t, 'none'); continue
    i = 1 + np.argmax(st[1:, 4]); mm = (lab == i).astype(np.uint8)
    cs, _ = cv2.findContours(mm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); c = max(cs, key=len)[:, 0, :].astype(np.float64)
    # algebraic circle fit on contour points not on the frame edge
    c = c[(c[:, 0] > 2) & (c[:, 0] < 2203)]
    A = np.c_[2 * c[:, 0], 2 * c[:, 1], np.ones(len(c))]; b = (c ** 2).sum(1)
    x, y, e = np.linalg.lstsq(A, b, rcond=None)[0]; r = np.sqrt(e + x * x + y * y)
    res = np.abs(np.hypot(c[:, 0] - x, c[:, 1] - y) - r)
    (ex, ey), (ew, eh), ea = cv2.fitEllipse(c.astype(np.float32).reshape(-1, 1, 2)) if len(c) > 5 else ((0, 0), (0, 0), 0)
    print(f'{t:.2f} circle ({x:7.1f},{y:6.1f}) r {r:5.1f} res {res.mean():4.1f}   ellipse ({ex:7.1f},{ey:6.1f}) {ew:5.1f}x{eh:5.1f} a {ea:5.1f}')
