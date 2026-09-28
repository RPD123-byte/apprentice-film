# s16 fix 2: the flying owl's feet (measurement only; never loaded by the film). The fix-1 drawings drew the feet as
# pale blobs with dark medial-axis blotches and fragmentary toe lines. This measures each toe's axis instead: the feet
# are found as the silhouette's thin parts below and right of the body (opening by a 25 px disc), each box grown to
# the whole foot, and the toes' pale centre-lines traced inside it (tr.strokes, bright polarity, sigma 1.8/2.6),
# oriented base -> tip (the tip is the end farther from the body's centroid). Output: data/feet.js,
# FEET[id] = { B: foot boxes [x0, y0, x1, y1], T: toe strokes [x, y, w, v, ...] base -> tip } (frame px).
# Usage: python3 feet.py OWLJSON
import sys, os, json, cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s16-fix2-final/tools')
import tr, h16
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'feet.js')
# 1143: the near foot clutches the belly (not a thin part of the silhouette): its box read off a 2.5x grid
EXTRA = {1143: [[1140, 425, 1215, 482]]}
def main(path):
    D = json.load(open(path)); res = {}
    k25 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
    for n in range(1143, 1162):
        d = D.get(str(n))
        if not d: continue
        x0, y0, x1, y1 = d['box']
        sm = np.zeros((946, 2206), np.uint8)
        for r in d['sil']: cv2.fillPoly(sm, [np.array(r, np.float32).reshape(-1, 2).round().astype(np.int32)], 1)
        op = cv2.morphologyEx(sm, cv2.MORPH_OPEN, k25)
        ys, xs = np.nonzero(op); cy, cx = ys.mean(), xs.mean()
        thin = (sm & (1 - op)).astype(np.uint8)
        nl, lab, st, cen = cv2.connectedComponentsWithStats(thin)
        boxes = []
        for i in range(1, nl):
            bx, by, bw, bh, a = st[i]
            if a < 120 or cen[i][1] < cy + 0.1 * (y1 - y0) or cen[i][0] < x0 + 0.45 * (x1 - x0): continue
            boxes.append([int(bx) - 14, int(by) - 40, int(bx + bw) + 14, int(by + bh) + 4])
        boxes += EXTRA.get(n, [])
        P = h16.pre(n); Y = cv2.GaussianBlur(P, (0, 0), 0.7)
        se = cv2.erode(sm, np.ones((3, 3), np.uint8))
        toes = []
        for b in boxes:
            m = np.zeros(P.shape, bool); m[b[1]:b[3], b[0]:b[2]] = True; m &= se > 0
            S = tr.strokes(Y, np.zeros_like(Y), m, polarity='bright', sigmas=(1.8, 2.6), hi=0.06, lo=0.03, minlen=10,
                           dmin=0.4, maxw=10, valley=0.06, smooth=5)
            # at most 4 per foot (three toes and the leg): the longest first, skipping near-duplicates (mean distance
            # < 5 px to a kept one) and fragments shorter than 12 px
            S = sorted(S, key=lambda s: -np.sum(np.hypot(*np.diff(np.array(s)[:, :2], axis=0).T)))
            kept = []
            for s in S:
                A = np.array(s)
                if np.hypot(*(A[-1, :2] - A[0, :2])) < 12 or len(kept) >= 4: continue
                if any(np.mean(np.min(np.hypot(A[:, None, 0] - K[None, :, 0], A[:, None, 1] - K[None, :, 1]), 1)) < 5 for K in kept): continue
                kept.append(A)
            for A in kept:
                if np.hypot(A[0, 0] - cx, A[0, 1] - cy) > np.hypot(A[-1, 0] - cx, A[-1, 1] - cy): A = A[::-1]
                v = [float(cv2.getRectSubPix(Y, (1, 1), (float(x), float(y)))[0, 0]) for x, y in A[:, :2]]
                toes.append([round(float(x), 1) for row in [[A[i, 0], A[i, 1], min(8.0, A[i, 2]), v[i]] for i in range(len(A))] for x in row])
        res[n] = {'B': boxes, 'T': toes}
        print(n, len(boxes), 'boxes', len(toes), 'toes')
    with open(OUT, 'w') as f:
        f.write('// s16 fix 2: the flying owl\'s feet per drawing: foot boxes B and toe axes T [x, y, w, v, ...] base -> tip\n'
                '// (frame px), measured by src/shots/s16/trace/feet.py (geometry, a width and a value per point; no pixels)\n')
        f.write('export const FEET = {\n' + ',\n'.join(f'{k}: {json.dumps(v, separators=(",", ":"))}' for k, v in res.items()) + '\n};\n')
if __name__ == '__main__': main(sys.argv[1])
