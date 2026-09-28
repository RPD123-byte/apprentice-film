import sys; sys.path.insert(0, '.')
from lab import src
import numpy as np, cv2
bg = np.median(np.stack([src(57.32, True), src(57.36, True)]).astype(np.float32), 0)
bgb = cv2.GaussianBlur(bg, (0, 0), 1.5)
rs = np.random.RandomState(1)
for k in range(1436, 1453):
    t = k / 25; f = cv2.GaussianBlur(src(t, True).astype(np.float32), (0, 0), 1.5)
    d = np.abs(f - bgb); m = (d > 18).astype(np.uint8) * 255
    m[850:] = 0      # floor shadow region below the ball's lowest point is excluded
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    # fill holes
    ff = m.copy(); h, w = m.shape; msk = np.zeros((h + 2, w + 2), np.uint8); cv2.floodFill(ff, msk, (0, 0), 255); m = m | (~ff & 255)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (61, 61)))
    n, lab, st, cen = cv2.connectedComponentsWithStats((m > 0).astype(np.uint8))
    if n < 2: print(t, 'none'); continue
    i = 1 + np.argmax(st[1:, 4]); mm = (lab == i).astype(np.uint8)
    cs, _ = cv2.findContours(mm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); c = max(cs, key=len)[:, 0, :].astype(np.float64)
    c = c[(c[:, 0] > 2) & (c[:, 0] < 2203) & (c[:, 1] < 848)]
    best = None
    for it in range(400):
        p = c[rs.choice(len(c), 3, replace=False)]
        A = np.c_[2 * p[:, 0], 2 * p[:, 1], np.ones(3)]; b = (p ** 2).sum(1)
        try: x, y, e = np.linalg.solve(A, b)
        except Exception: continue
        r = np.sqrt(e + x * x + y * y)
        if not (110 < r < 190): continue
        inl = np.abs(np.hypot(c[:, 0] - x, c[:, 1] - y) - r) < 5
        if best is None or inl.sum() > best[0]: best = (inl.sum(), x, y, r, inl)
    if best is None: print(t, 'nofit'); continue
    _, x, y, r, inl = best
    p = c[inl]; A = np.c_[2 * p[:, 0], 2 * p[:, 1], np.ones(len(p))]; b = (p ** 2).sum(1)
    x, y, e = np.linalg.lstsq(A, b, rcond=None)[0]; r = np.sqrt(e + x * x + y * y)
    print(f'{t:.2f} ({x:7.1f},{y:6.1f}) r {r:5.1f}  inliers {inl.mean():4.2f}  bbox {st[i][:4]}')
