# lines.py -- the MAJOR ink lines of a drawing as coarse polylines: skeleton of the dark line mask, split into
# branch-free paths, paths shorter than minLen dropped, simplified (Douglas-Peucker, eps px), one width and one value
# per line. (A redraw guide: few control points per line; the film draws them with its own tapered pen.)
import cv2, numpy as np
from skimage.morphology import skeletonize

NB = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]

def paths_of(sk):
    sk = sk.astype(bool)
    H, W = sk.shape
    ys, xs = np.nonzero(sk)
    pix = set(zip(ys.tolist(), xs.tolist()))
    def nbrs(p):
        y, x = p
        out = []
        for dy, dx in NB:
            q = (y + dy, x + dx)
            if q not in pix: continue
            if dy and dx and ((y + dy, x) in pix or (y, x + dx) in pix): continue  # diagonal shortcut of a step
            out.append(q)
        return out
    deg = {p: len(nbrs(p)) for p in pix}
    nodes = {p for p, d in deg.items() if d != 2}
    seen = set(); paths = []
    def walk(a, b):
        path = [a, b]; prev, cur = a, b
        while cur not in nodes:
            nx = [q for q in nbrs(cur) if q != prev and (min(cur, q), max(cur, q)) not in seen]
            if not nx: break
            q = nx[0]; seen.add((min(cur, q), max(cur, q))); prev, cur = cur, q; path.append(cur)
        return path
    for a in nodes:
        for b in nbrs(a):
            e = (min(a, b), max(a, b))
            if e in seen: continue
            seen.add(e); paths.append(walk(a, b))
    # pure loops (no nodes)
    for p in pix:
        if deg[p] == 2 and all((min(p, q), max(p, q)) not in seen for q in nbrs(p)):
            q = nbrs(p)[0]; seen.add((min(p, q), max(p, q))); paths.append(walk(p, q))
    return paths

def major_lines(dark, P, minLen=30, eps=2.0, maxN=220):
    """dark: uint8 mask of the ink; P: ungraded value image. Returns [{p: [x,y,...], w, v}]"""
    sk = skeletonize(dark > 0)
    dt = cv2.distanceTransform((dark > 0).astype(np.uint8), cv2.DIST_L2, 5)
    out = []
    for path in paths_of(sk):
        a = np.array([[x, y] for y, x in path], np.float32)
        L = np.sum(np.hypot(*np.diff(a, axis=0).T)) if len(a) > 1 else 0
        if L < minLen: continue
        s = cv2.approxPolyDP(a.reshape(-1, 1, 2), eps, False).reshape(-1, 2)
        ys, xs = a[:, 1].astype(int), a[:, 0].astype(int)
        w = float(np.median(dt[ys, xs]) * 2)
        v = float(np.median(P[ys, xs]))
        out.append(dict(p=[round(float(t), 1) for t in s.reshape(-1)], w=round(max(1.0, w), 2), v=round(v, 3), L=float(L)))
    out.sort(key=lambda q: -q['L'])
    return out[:maxN]
