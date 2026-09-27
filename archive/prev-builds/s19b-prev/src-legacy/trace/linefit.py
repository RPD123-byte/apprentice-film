# Per-frame card homography during the lift from its straight lines: LSD segments in each frame are associated with
# the card's model lines (paper edges, text box sides, button line, divider; layout measured by cardlayout.py) near
# their predicted positions, and the homography is solved so that every associated segment's end points fall on
# their model line (robust least squares, association radius 40 → 5 px). Each frame starts from the previous one's
# fit plus a damped velocity. Measurement only; output = card corners per frame.
import sys, json, numpy as np, cv2
from scipy.optimize import least_squares
from common import frame
CW, CH = 465, 648
C = np.float32([[0, 0], [CW, 0], [CW, CH], [0, CH]])
A = dict(x0=44.8, y0=153.8, x1=424.1, y1=601.2, btnY=538.8, divX=239.8)
KEY = 2.5   # the paper's dark keyline sits ~2.5 units outside the paper
# model lines: (name, point a, point b) in card units (segments; extent used for association)
LINES = [
    ('pL', (-KEY * 0 + 0, 40), (0, CH - 40)), ('pR', (CW, 40), (CW, CH - 40)), ('pT', (40, 0), (CW - 40, 0)), ('pB', (40, CH), (CW - 40, CH)),
    ('bL', (A['x0'], A['y0'] + 15), (A['x0'], A['y1'] - 15)), ('bR', (A['x1'], A['y0'] + 15), (A['x1'], A['y1'] - 15)),
    ('bT', (A['x0'] + 15, A['y0']), (A['x1'] - 15, A['y0'])), ('bB', (A['x0'] + 15, A['y1']), (A['x1'] - 15, A['y1'])),
    ('btn', (A['x0'], A['btnY']), (A['x1'], A['btnY'])), ('div', (A['divX'], A['btnY']), (A['divX'], A['y1'])),
]
def Hq(q): return cv2.getPerspectiveTransform(C, np.float32(q).reshape(4, 2)).astype(np.float64)
def ph(H, pts):
    p = np.c_[pts, np.ones(len(pts))] @ H.T; return p[:, :2] / p[:, 2:3]
def segments(g):
    g8 = np.clip(cv2.GaussianBlur(g, (0, 0), 1.0), 0, 255).astype(np.uint8)
    L = cv2.createLineSegmentDetector(0).detect(g8)[0].reshape(-1, 4)
    ln = np.hypot(L[:, 2] - L[:, 0], L[:, 3] - L[:, 1])
    return L[ln > 22]
def associate(H, S, dmax, amax=np.radians(10)):
    Hi = np.linalg.inv(H); pairs = []
    for j, (nm, a, b) in enumerate(LINES):
        pa, pb = ph(H, np.array([a, b], float))
        d = pb - pa; Ld = np.linalg.norm(d)
        if Ld < 1: continue
        t = d / Ld; n = np.array([-t[1], t[0]])
        for s in S:
            e0, e1 = s[:2], s[2:]
            ds = e1 - e0; ls = np.linalg.norm(ds)
            ang = np.arccos(min(1, abs(np.dot(ds / ls, t))))
            if ang > amax: continue
            if max(abs(np.dot(e0 - pa, n)), abs(np.dot(e1 - pa, n))) > dmax: continue
            # extent along the model line (card units)
            m = ph(Hi, np.array([e0, e1]))
            if nm[1] in 'LR' or nm == 'div': along = m[:, 1]; lo, hi = min(a[1], b[1]), max(a[1], b[1])
            else: along = m[:, 0]; lo, hi = min(a[0], b[0]), max(a[0], b[0])
            if along.max() < lo - 20 or along.min() > hi + 20: continue
            pairs.append((j, e0, e1, ls))
    return pairs
def solve(q0, pairs, fs):
    E = np.array([np.r_[e0, e1] for _, e0, e1, _ in pairs]); J = [j for j, *_ in pairs]; Wt = np.sqrt([l for *_, l in pairs])
    def res(p):
        H = Hq(p.reshape(4, 2)); out = []
        for k, j in enumerate(J):
            nm, a, b = LINES[j]
            pa, pb = ph(H, np.array([a, b], float)); d = pb - pa; t = d / np.linalg.norm(d); n = np.array([-t[1], t[0]])
            out += [np.dot(E[k, :2] - pa, n) * Wt[k] / 5, np.dot(E[k, 2:] - pa, n) * Wt[k] / 5]
        # weak prior toward the start (keeps unconstrained directions from drifting)
        out += list((p - np.float64(q0).ravel()) * 0.02)
        return np.array(out)
    r = least_squares(res, np.float64(q0).ravel(), loss='soft_l1', f_scale=fs, max_nfev=200)
    return r.x.reshape(4, 2)
def fit(n, q0):
    g = frame(n).astype(np.float32); S = segments(g)
    q = np.float64(q0)
    for dmax in (40, 25, 14, 8, 5):
        pr = associate(Hq(q), S, dmax)
        names = sorted(set(LINES[j][0] for j, *_ in pr))
        if len(names) < 3: continue
        q = solve(q, pr, fs=max(2.0, dmax / 2))
    pr = associate(Hq(q), S, 4)
    return q, sorted(set(LINES[j][0] for j, *_ in pr)), len(pr)
if __name__ == '__main__':
    times = [float(t) for t in sys.argv[1].split(',')]
    init = {round(r[0], 2): np.array(r[1:], float).reshape(4, 2) for r in json.load(open(sys.argv[2]))}
    out = sys.argv[3]; res = []; prev = prev2 = None
    for t in times:
        if round(t, 2) in init and (prev is None or '--init' in sys.argv): p0 = init[round(t, 2)]
        elif prev2 is None: p0 = prev[1]
        else: p0 = prev[1] + 0.7 * (prev[1] - prev2[1])
        q, names, npair = fit(int(round(t * 25)), p0)
        prev2, prev = prev, (t, q)
        res.append([t] + [round(float(v), 1) for v in q.ravel()])
        print(t, npair, ','.join(names), np.round(q, 1).tolist(), flush=True)
        json.dump(res, open(out, 'w'))
