import sys, json, cv2, numpy as np; sys.path.insert(0, '.')
import h16
def rast(rings, shape):
    m = np.zeros(shape, np.uint8)
    for r in rings:
        p = np.round(np.array(r).reshape(-1, 2) * 16).astype(np.int32); t = np.zeros_like(m); cv2.fillPoly(t, [p], 1, shift=4); m ^= t
    return m
def prof(n, Rg):
    d = json.load(open(f'../s16-fix1-work/owl3_{n}.json')); S = h16.gray(h16.src(n))
    sil = rast(d['sil'], S.shape); hp = rast(d['HP']['rings'], S.shape) if 'HP' in d else np.zeros_like(sil)
    din = cv2.distanceTransform(sil, cv2.DIST_L2, 5); dout = cv2.distanceTransform(1 - sil, cv2.DIST_L2, 5)
    ok = cv2.dilate(hp, np.ones((15, 15), np.uint8)) == 0
    row = []
    for lo, hi in [(-4, -3), (-3, -2), (-2, -1), (-1, 0), (0, 1), (1, 2), (2, 3), (3, 4), (4, 6), (6, 9)]:
        m = ok & (((lo < 0) & (dout > -hi) & (dout <= -lo) & (sil == 0)) | ((lo >= 0) & (din > lo) & (din <= hi) & (sil > 0)))
        row.append('%d:%3.0f/%3.0f' % (lo, S[m].mean(), Rg[m].mean()))
    return ' '.join(row)
if __name__ == '__main__':
    from lab import Lab
    L = Lab()
    for fe in [float(v) for v in sys.argv[1].split(',')]:
        L.tune(None, {'feather': fe})
        for n in (1153,):
            r = L.graded(n, False); print(fe, prof(n, h16.gray(r.astype(np.float32))))
    L.close()
