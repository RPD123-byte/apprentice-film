# dustfit2.py: per source frame, the dust as circles (58.16–58.68) and curls (58.72–58.92): for each connected piece
# its centroid, equivalent radius and principal angle. Printed as a JS table.
import re, json, numpy as np, cv2
src = open('../../src/shots/s19/dustdata.js').read()
D = {}
for m in re.finditer(r'"([\d.]+)": (\[\[.*?\]\])', src): D[m.group(1)] = json.loads(m.group(2))
circ, curls = {}, {}
for k, pieces in D.items():
    t = float(k)
    M = np.zeros((946, 2206), np.uint8)
    for p in pieces: cv2.fillPoly(M, [np.array(p, np.int32).reshape(-1, 2)], 1)
    if t <= 58.765:
        area = M.sum(); cs = []; cov = np.zeros_like(M); R = M.copy()
        for it in range(12):
            dt = cv2.distanceTransform(R, cv2.DIST_L2, 5); y, x = np.unravel_index(np.argmax(dt), dt.shape); r = dt[y, x]
            if r < 7: break
            cs.append([int(x), int(y), round(float(r) * 1.08, 1)]); cv2.circle(cov, (int(x), int(y)), int(r * 1.08), 1, -1); cv2.circle(R, (int(x), int(y)), int(r * 0.8), 0, -1)
            if (cov & M).sum() > 0.93 * area: break
        circ[k] = cs
        print(k, 'circles', len(cs), 'IoU %.2f' % ((cov & M).sum() / max(1, (cov | M).sum())))
    if t >= 58.555:
        n, lab, st, cen = cv2.connectedComponentsWithStats(M)
        cl = []
        for i in range(1, n):
            if st[i, 4] < 30: continue
            ys, xs = np.nonzero(lab == i); cx, cy = xs.mean(), ys.mean()
            cov_ = np.cov(np.stack([xs - cx, ys - cy])); ev, evec = np.linalg.eigh(cov_)
            ang = float(np.arctan2(evec[1, 1], evec[0, 1]))
            cl.append([round(float(cx)), round(float(cy)), round(float(np.sqrt(st[i, 4] / np.pi)), 1), round(float(2 * np.sqrt(ev[1])), 1), round(ang, 2)])
        curls[k] = cl
        print(k, 'pieces', len(cl))
with open('../s19b-study/dust.js.txt', 'w') as f:
    f.write('export const PUFFS = {\n' + ''.join(f'  "{k}": {json.dumps(v)},\n' for k, v in circ.items()) + '};\n')
    f.write('export const WISPS = {\n' + ''.join(f'  "{k}": {json.dumps(v)},\n' for k, v in curls.items()) + '};\n')
