# analyse the dark parts of each flying-owl drawing: opened blobs (cups) vs thin parts
import sys, json, cv2, numpy as np; sys.path.insert(0, '.')
import h16
O = json.load(open('../s16-fix1-work/owl2_data.json'))
def raster(item, shape, off, S=1):
    m = np.zeros(shape, np.uint8)
    for r in item[1:]:
        p = np.round((np.array(r).reshape(-1, 2) - off) * S * 16).astype(np.int32)
        t = np.zeros_like(m); cv2.fillPoly(t, [p], 1, shift=4); m ^= t
    return m
for n in [int(a) for a in sys.argv[1:]]:
    d = O[str(n)]; x0, y0, x1, y1 = d['box']; off = np.array([x0 - 10, y0 - 10]); shape = (y1 - y0 + 20, x1 - x0 + 20)
    D = [it for it in d['D'] if it[0] == 600 or it[0] == 598 or it[0] == 599 or it[0] == 601 or it[0]==584 or it[0]==588 or it[0]==591]
    m = raster(D[0], shape, off) if D else np.zeros(shape, np.uint8)
    dt = cv2.distanceTransform(m, cv2.DIST_L2, 5)
    for r in (6, 8, 10):
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
        op = cv2.morphologyEx(m, cv2.MORPH_OPEN, k)
        nl, lab, st, cen = cv2.connectedComponentsWithStats(op)
        print(n, 'r', r, 'blobs', [(int(st[i, 4]), tuple(int(v) for v in cen[i] + off)) for i in range(1, nl) if st[i, 4] > 50])
    nl, lab, st, cen = cv2.connectedComponentsWithStats(m)
    print(n, 'D comps', nl - 1, 'max dt', float(dt.max()), 'areas', sorted([int(st[i, 4]) for i in range(1, nl)], reverse=True)[:8])
