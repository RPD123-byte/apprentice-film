# owlparts_err.py DIR n... : sigma-4 |error| of the flying owl by part (interior, edge band, headphones, eyes, outside ring)
import sys, json, cv2, numpy as np; sys.path.insert(0, '.')
import h16
def rast(rings, shape):
    m = np.zeros(shape, np.uint8)
    for r in rings:
        p = np.round(np.array(r).reshape(-1, 2) * 16).astype(np.int32); t = np.zeros_like(m); cv2.fillPoly(t, [p], 1, shift=4); m ^= t
    return m
for a in sys.argv[2:]:
    n = int(a); d = json.load(open(f'../s16-fix1-work/owl3_{n}.json'))
    R = h16.gray(cv2.imread(f'{sys.argv[1]}/r{n}.png').astype(np.float32)); S = h16.gray(h16.src(n))
    e = cv2.GaussianBlur(R, (0, 0), 4) - cv2.GaussianBlur(S, (0, 0), 4)
    sil = rast(d['sil'], R.shape); hp = rast(d['HP']['rings'], R.shape) if 'HP' in d else np.zeros_like(sil)
    ez = np.zeros_like(sil)
    for E in d.get('E', []):
        if E[8] > 0: cv2.ellipse(ez, ((E[6], E[7]), (E[8] + 6, E[9] + 6), E[10]), 1, -1)
    inner = cv2.erode(sil, np.ones((9, 9), np.uint8)) & (cv2.dilate(hp | ez, np.ones((9, 9), np.uint8)) == 0)
    edge = sil & (cv2.erode(sil, np.ones((9, 9), np.uint8)) == 0) & (cv2.dilate(hp, np.ones((9, 9), np.uint8)) == 0)
    out = cv2.dilate(sil, np.ones((9, 9), np.uint8)) & (sil == 0)
    parts = dict(inner=inner, edge=edge, hp=cv2.dilate(hp, np.ones((5, 5), np.uint8)), eyes=ez, outring=out)
    print(n, ' '.join('%s %.2f(%+.2f)' % (k, np.abs(e[m > 0]).mean(), e[m > 0].mean()) for k, m in parts.items() if m.any()))
