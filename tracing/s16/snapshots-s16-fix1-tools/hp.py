import sys, json, cv2, numpy as np; sys.path.insert(0, '.')
import h16
from skimage.morphology import skeletonize
O = json.load(open('../s16-fix1-work/owl2_data.json'))
def raster(item, shape, off):
    m = np.zeros(shape, np.uint8)
    for r in item[1:]:
        p = np.round((np.array(r).reshape(-1, 2) - off) * 16).astype(np.int32)
        t = np.zeros_like(m); cv2.fillPoly(t, [p], 1, shift=4); m ^= t
    return m
outs = []
for n in [int(a) for a in sys.argv[1:]]:
    d = O[str(n)]; x0, y0, x1, y1 = d['box']; off = np.array([x0 - 10, y0 - 10]); shape = (y1 - y0 + 20, x1 - x0 + 20)
    m = raster(d['D'][0], shape, off)
    nl, lab, st, cen = cv2.connectedComponentsWithStats(m)
    big = 1 + int(np.argmax(st[1:, 4])); hp = (lab == big).astype(np.uint8)
    Y = h16.pre(n)[off[1]:off[1] + shape[0], off[0]:off[0] + shape[1]]
    Y2 = cv2.GaussianBlur(Y, (0, 0), 2.0)
    dt = cv2.distanceTransform(hp, cv2.DIST_L2, 5)
    sk = skeletonize(hp > 0)
    print(n, 'hp area', hp.sum(), 'skeleton dt pct 10/50/90', np.percentile(dt[sk], [10, 50, 90]).round(1), 'vals pct', np.percentile(Y2[hp > 0], [10, 30, 50, 70, 90]).round(2))
    for th in (0.12, 0.16, 0.2):
        cup = ((Y2 > th) & (hp > 0)).astype(np.uint8)
        cup = cv2.morphologyEx(cup, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
        nl2, lab2, st2, cen2 = cv2.connectedComponentsWithStats(cup)
        bl = [(int(st2[i, 4]), tuple((cen2[i] + off).round().astype(int))) for i in range(1, nl2) if st2[i, 4] > 150]
        print('   th', th, bl)
    vis = cv2.cvtColor((np.clip(Y, 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    cup = ((Y2 > 0.16) & (hp > 0)).astype(np.uint8)
    vis[(hp > 0) & (cup == 0)] = (vis[(hp > 0) & (cup == 0)] * 0.5 + np.array([200, 0, 200]) * 0.5).astype(np.uint8)
    vis[cup > 0] = (vis[cup > 0] * 0.5 + np.array([0, 200, 0]) * 0.5).astype(np.uint8)
    outs.append(cv2.resize(vis, (500, int(500 * vis.shape[0] / vis.shape[1]))))
h = max(o.shape[0] for o in outs)
cv2.imwrite('../s16-fix1-crops/hp.jpg', np.hstack([np.vstack([o, np.zeros((h - o.shape[0], 500, 3), np.uint8)]) for o in outs]))
