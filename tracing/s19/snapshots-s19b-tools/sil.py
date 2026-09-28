# owl silhouettes 57.40-61.40 by difference against the owl-free first frames; prints bbox/centroid/area/axis
import sys; sys.path.insert(0, '.')
from lab import src
import numpy as np, cv2, json
bg = np.median(np.stack([src(57.32, True), src(57.36, True)]).astype(np.float32), 0)
bgb = cv2.GaussianBlur(bg, (0, 0), 2)
out = {}
for k in range(1435, 1536):
    t = k / 25; f = cv2.GaussianBlur(src(t, True).astype(np.float32), (0, 0), 2)
    d = np.abs(f - bgb)
    m = (d > 28).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    n, lab, st, cen = cv2.connectedComponentsWithStats(m)
    if n < 2: print(f'{t:.2f} none'); continue
    i = 1 + np.argmax(st[1:, 4])
    x, y, w, h, a = st[i]
    ys, xs = np.nonzero(lab == i)
    cx, cy = xs.mean(), ys.mean()
    cov = np.cov(np.stack([xs - cx, ys - cy]))
    ev, evec = np.linalg.eigh(cov); ang = np.degrees(np.arctan2(evec[1, 1], evec[0, 1]))
    out[f'{t:.2f}'] = dict(bbox=[int(x), int(y), int(x + w), int(y + h)], c=[round(cx, 1), round(cy, 1)], area=int(a))
    print(f'{t:.2f} bbox {x:5d} {y:4d} {x+w:5d} {y+h:4d}  c {cx:7.1f} {cy:6.1f}  area {a:6d}  ax {ang:6.1f} {np.sqrt(ev[1]):5.1f} {np.sqrt(ev[0]):5.1f}')
json.dump(out, open('../s19b-study/sil.json', 'w'))
