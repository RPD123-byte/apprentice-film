# dustsrc.py: measure the dust region on each source frame 58.16–58.92 (difference against the owl-free 57.32/57.36,
# inside x 1290–1700, y 640–866, excluding the owl's own silhouette region to the left) -> circles / wisp pieces
import sys; sys.path.insert(0, '.')
from lab import src
import numpy as np, cv2, json
bg = cv2.GaussianBlur(np.median(np.stack([src(57.32, True), src(57.36, True)]).astype(np.float32), 0), (0, 0), 1.2)
OWLX = {58.16: 1380, 58.20: 1335, 58.24: 1318, 58.28: 1300, 58.32: 1290}
circ, curls = {}, {}
for k in range(1454, 1474):
    t = round(k / 25, 2); f = cv2.GaussianBlur(src(t, True).astype(np.float32), (0, 0), 1.2)
    d = np.abs(f - bg); M = ((d > 14)).astype(np.uint8)
    M[:640] = 0; M[866:] = 0; M[:, :OWLX.get(t, 1285)] = 0; M[:, 1720:] = 0
    M = cv2.morphologyEx(M, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    ff = M * 255; mk = np.zeros((948, 2208), np.uint8); f2 = ff.copy(); cv2.floodFill(f2, mk, (0, 0), 255); M = ((ff | (~f2 & 255)) > 0).astype(np.uint8)
    M = cv2.morphologyEx(M, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, cen = cv2.connectedComponentsWithStats(M)
    keep = np.zeros_like(M)
    for i in range(1, n):
        if st[i, 4] >= 40: keep[lab == i] = 1
    M = keep
    area = int(M.sum())
    if t <= 58.765:
        cs = []; cov = np.zeros_like(M); R = M.copy()
        for it in range(14):
            dt = cv2.distanceTransform(R, cv2.DIST_L2, 5); y, x = np.unravel_index(np.argmax(dt), dt.shape); r = dt[y, x]
            if r < 6: break
            cs.append([int(x), int(y), round(float(r) * 1.06, 1)]); cv2.circle(cov, (int(x), int(y)), int(r * 1.06), 1, -1); cv2.circle(R, (int(x), int(y)), int(r * 0.8), 0, -1)
            if (cov & M).sum() > 0.93 * area: break
        band = M[848:866]; xs_ = np.nonzero(band.any(0))[0]
        tail = int(xs_.min()) if len(xs_) else 0
        if t < 58.18: cs = [c for c in cs if c[1] > 775]
        circ[f'{t:.2f}'] = [tail, cs]
        print(f'{t:.2f} area {area} circles {len(cs)} IoU {(cov & M).sum() / max(1, (cov | M).sum()):.2f}')
    if t >= 58.555:
        n, lab, st, cen = cv2.connectedComponentsWithStats(M); cl = []
        for i in range(1, n):
            ys, xs = np.nonzero(lab == i); cx, cy = xs.mean(), ys.mean()
            cv_ = np.cov(np.stack([xs - cx, ys - cy])); ev, evec = np.linalg.eigh(cv_)
            cl.append([round(float(cx)), round(float(cy)), round(float(np.sqrt(st[i, 4] / np.pi)), 1), round(float(2 * np.sqrt(max(ev[1], 0))), 1), round(float(np.arctan2(evec[1, 1], evec[0, 1])), 2)])
        curls[f'{t:.2f}'] = cl
        print(f'{t:.2f} pieces {len(cl)}')
with open('../s19b-study/dust.js.txt', 'w') as f:
    f.write('export const PUFFS = {\n' + ''.join(f'  "{k}": {json.dumps(v)},\n' for k, v in circ.items()) + '};\n')
    f.write('export const WISPS = {\n' + ''.join(f'  "{k}": {json.dumps(v)},\n' for k, v in curls.items()) + '};\n')
