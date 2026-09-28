# figtrack.py TK T0 T1 'x,y x,y ...' out.json  -- the figure's motion around a key frame: KLT points inside the hand
# polygon (figure at TK, lid excluded), tracked frame to frame (forward-backward checked) from TK to every frame in
# [T0, T1]; per frame a RANSAC homography frame(TK) -> frame(t). Measurement only (numbers).
import sys, json, re, cv2, numpy as np
from lib import src
tk, t0, t1 = float(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3])
P = np.array([[float(v) for v in q.split(',')] for q in sys.argv[4].split()], np.int32)
out = sys.argv[5]
js = open('../../src/shots/s28/drawn/measure.js').read()
LIDQ = eval(re.search(r'export const LIDQ = (\[\[.*?\]\]);', js, re.S).group(1))
def lid(t):
    k = int(round((t - LIDQ[0][0]) * 25)); r = LIDQ[max(0, min(len(LIDQ) - 1, k))]
    return np.array(r[1:9]).reshape(4, 2).astype(np.float32)
def gray(t): return cv2.cvtColor(src(t), cv2.COLOR_BGR2GRAY)
def outside_lid(pts, t, pad=12):
    q = lid(t); c = q.mean(0); q2 = c + (q - c) * 1.0
    return np.array([cv2.pointPolygonTest(q2.reshape(-1, 1, 2), (float(x), float(y)), True) < -pad for x, y in pts])
g0 = gray(tk)
m = np.zeros_like(g0); cv2.fillPoly(m, [P], 255)
pts = cv2.goodFeaturesToTrack(g0, 3000, 0.01, 6, mask=m)[:, 0, :]
pts = pts[outside_lid(pts, tk)]
res = {}
bx0, by0, bw, bh = cv2.boundingRect(P)
GX, GY = 9, 6
gx = bx0 + np.arange(GX) * bw / (GX - 1); gy = by0 + np.arange(GY) * bh / (GY - 1)
GP = np.array([[x, y] for y in gy for x in gx])
sig = max(bw / (GX - 1), bh / (GY - 1)) * 0.8
def field(p0, p1, H):
    # residual displacement after the homography, kernel-regressed on the control grid (in key-frame coordinates)
    pr = cv2.perspectiveTransform(p0.reshape(-1, 1, 2), H).reshape(-1, 2)
    r = p1 - pr
    ok = np.linalg.norm(r, axis=1) < 30
    p0, r = p0[ok], r[ok]
    d2 = ((GP[:, None, :] - p0[None]) ** 2).sum(-1)
    w = np.exp(-d2 / (2 * sig * sig))
    ws = w.sum(1, keepdims=True)
    D = (w @ r) / np.maximum(ws, 1e-6)
    D *= np.minimum(1, ws / 3)        # fade to 0 where no tracks
    # error after the field
    wq = np.exp(-((p0[:, None, :] - GP[None]) ** 2).sum(-1) / (2 * sig * sig))
    rq = (wq @ D) / np.maximum(wq.sum(1, keepdims=True), 1e-6)
    return D, float(np.median(np.linalg.norm(r - rq, axis=1)))
lk = dict(winSize=(21, 21), maxLevel=3, criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01))
for direction in (+1, -1):
    t = tk; g = g0; cur = pts.copy(); ids = np.arange(len(pts))
    while True:
        tn = round((t + direction * 0.04) * 100) / 100
        if tn > t1 + 1e-6 or tn < t0 - 1e-6: break
        gn = gray(tn)
        p1, st, _ = cv2.calcOpticalFlowPyrLK(g, gn, cur.reshape(-1, 1, 2), None, **lk)
        p0r, st2, _ = cv2.calcOpticalFlowPyrLK(gn, g, p1, None, **lk)
        fb = np.linalg.norm(p0r.reshape(-1, 2) - cur, axis=1)
        ok = (st[:, 0] == 1) & (st2[:, 0] == 1) & (fb < 1.0)
        p1 = p1.reshape(-1, 2)
        ok &= outside_lid(p1, tn, 6)
        cur, ids = p1[ok], ids[ok]
        H, inl = cv2.findHomography(pts[ids], cur, cv2.RANSAC, 3.0)
        n = int(inl.sum()) if inl is not None else 0
        e = float(np.median(np.linalg.norm(cv2.perspectiveTransform(pts[ids].reshape(-1, 1, 2), H).reshape(-1, 2) - cur, axis=1)))
        D, e2 = field(pts[ids], cur, H)
        res[f'{tn:.2f}'] = {'H': [round(v, 8) for v in (H / H[2, 2]).ravel().tolist()], 'n': n, 'err': round(e, 2), 'err2': round(e2, 2),
                            'D': [round(float(v), 2) for v in D.ravel()]}
        print(f'{tn:.2f} pts {len(cur):4d} inl {n:4d} med err {e:.2f} after field {e2:.2f}')
        t, g = tn, gn
        if len(cur) < 30: break
res[f'{tk:.2f}'] = {'H': [1, 0, 0, 0, 1, 0, 0, 0, 1], 'n': len(pts), 'err': 0, 'err2': 0, 'D': [0] * (GX * GY * 2)}
res['grid'] = {'x0': bx0, 'y0': by0, 'w': bw, 'h': bh, 'nx': GX, 'ny': GY}
json.dump(res, open(out, 'w'))
