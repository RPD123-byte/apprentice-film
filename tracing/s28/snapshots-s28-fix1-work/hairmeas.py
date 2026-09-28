# s28 fix1: MEASURE the hair of a source frame as a coarse mass outline (<= N vertices) plus a short list of lock
# centre-lines (<= 5 points each, with a root width) -- sparse measurements, drawn later by hand-written code.
# Usage: hairmeas.py T "x,y x,y ..." (region polygon) [thr] [maxv] [out.jpg]
import sys, cv2, numpy as np, json
from skimage.morphology import skeletonize
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28d-tools')
from lib import src
t = float(sys.argv[1]); reg = np.array([[int(v) for v in p.split(',')] for p in sys.argv[2].split()], np.int32)
thr = int(sys.argv[3]) if len(sys.argv) > 3 else 40; maxv = int(sys.argv[4]) if len(sys.argv) > 4 else 34
out = sys.argv[5] if len(sys.argv) > 5 else None
f = src(t); g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
R = np.zeros(g.shape, np.uint8); cv2.fillPoly(R, [reg], 1)
dark = ((g < thr) & (R > 0)).astype(np.uint8)
k = lambda n: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))
mass = cv2.morphologyEx(cv2.morphologyEx(dark, cv2.MORPH_CLOSE, k(9)), cv2.MORPH_OPEN, k(23))
n, lab, st, _ = cv2.connectedComponentsWithStats(mass)
big = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])); mass = (lab == big).astype(np.uint8)
cs, _ = cv2.findContours(mass, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); c = max(cs, key=cv2.contourArea)
eps = 1.0
while True:
    a = cv2.approxPolyDP(c, eps, True)
    if len(a) <= maxv: break
    eps *= 1.2
M = [[int(p[0][0]), int(p[0][1])] for p in a]
thin = (dark & (1 - cv2.dilate(mass, k(5)))).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(thin)
md = cv2.distanceTransform(1 - mass, cv2.DIST_L2, 3)
locks = []
for i in range(1, n):
    if st[i, cv2.CC_STAT_AREA] < 60: continue
    comp = (lab == i)
    sk = skeletonize(comp)
    ys, xs = np.nonzero(sk)
    if len(xs) < 8: continue
    dt = cv2.distanceTransform(comp.astype(np.uint8), cv2.DIST_L2, 3)
    pts = list(zip(xs, ys)); S = set(pts)
    # root: skeleton point nearest the mass; tip: farthest along the skeleton from the root (BFS)
    root = min(pts, key=lambda p: md[p[1], p[0]])
    from collections import deque
    prev = {root: None}; q = deque([root]); last = root
    while q:
        p = q.popleft(); last = p
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                nb = (p[0] + dx, p[1] + dy)
                if nb in S and nb not in prev: prev[nb] = p; q.append(nb)
    path = []; p = last
    while p is not None: path.append(p); p = prev[p]
    path = path[::-1]
    if len(path) < 10: continue
    idx = np.linspace(0, len(path) - 1, min(5, max(3, len(path) // 12))).round().astype(int)
    P = [[int(path[j][0]), int(path[j][1])] for j in idx]
    w = float(2 * dt[path[min(3, len(path) - 1)][1], path[min(3, len(path) - 1)][0]])
    locks.append({'p': P, 'w': round(w, 1), 'len': len(path), 'attached': bool(md[root[1], root[0]] < 6)})
locks.sort(key=lambda L: -L['len'])
print(json.dumps({'mass': M, 'locks': [[L['p'], L['w'], int(L['attached'])] for L in locks]}))
print(f'# mass {len(M)} vertices, {len(locks)} locks', file=sys.stderr)
if out:
    o = (f * 0.45).astype(np.uint8)
    cv2.polylines(o, [np.array(M)], True, (0, 255, 0), 2)
    for L in locks: cv2.polylines(o, [np.array(L['p'])], False, (0, 0, 255) if L['attached'] else (255, 0, 255), max(1, int(L['w'] / 2)))
    cv2.polylines(o, [reg], True, (255, 255, 0), 1)
    x0, y0, w0, h0 = cv2.boundingRect(reg); cv2.imwrite(out, cv2.resize(o[y0:y0 + h0, x0:x0 + w0], None, fx=1.5, fy=1.5))
