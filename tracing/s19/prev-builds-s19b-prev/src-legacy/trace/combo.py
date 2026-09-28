# Card lift tracker (measurement only): per frame an 8-DOF homography (the card's 4 corners) solved from its
# keylines (linemeas.refine: darkest keyline near the prediction, paper on the right side) plus patch matches of
# the source's own standing card (patchtrack.match), with a weak prior that keeps the in-view part of the card near
# the prediction (so off-screen corners cannot run away). The prediction extrapolates the in-view card points of the
# two previous frames (damped). Search windows shrink 22 → 4 px. Repeated source frames hold the pose.
# Usage: combo.py t0,t1,... start.json out.json   (start.json: [t, 8 corner coords] rows; the last two seed it)
import sys, json, numpy as np, cv2
from scipy.optimize import least_squares
import linemeas as LM
import patchtrack as PT
from common import frame
CW, CH = 465, 648
GRID = np.array([(u, v) for u in np.linspace(0, CW, 9) for v in np.linspace(0, CH, 11)], float)
CORN = np.array([[0, 0], [CW, 0], [CW, CH], [0, CH]], float)
def inview(P, m=10): return (P[:, 0] > m) & (P[:, 0] < 2206 - m) & (P[:, 1] > m) & (P[:, 1] < 946 - m)
def predict(q1, q2, damp=0.6):
    if q2 is None: return q1
    H1, H2 = LM.Hq(q1), LM.Hq(q2)
    P1, P2 = LM.ph(H1, GRID), LM.ph(H2, GRID); X = P1 + damp * (P1 - P2)
    Hm, _ = cv2.findHomography(GRID.astype(np.float32), X.astype(np.float32), 0)
    return LM.ph(Hm, CORN)
def gather(g, q, R, S, skip=()):
    H = LM.Hq(q); lines = []
    for nm in LM.MODEL:
        if nm in skip: continue
        s0, s1 = LM.model_seg(nm); P = LM.ph(H, np.array([s0, s1], float)); cs = LM.clip_seg(P[0], P[1])
        if cs is None or np.linalg.norm(cs[1] - cs[0]) < 50: continue
        sg = (*cs[0], *cs[1])
        r = LM.refine(g, sg, R=R, inner=LM.inner_dir(q, nm, sg), kind='paper' if nm[0] == 'p' else 'box')
        if r is not None: lines.append((nm, r[0]))
    pts = []
    for (u, v) in PT.PTS:
        m = PT.match(g, H, u, v, S=S)
        if m is not None and m[1] > 0.75: pts.append(((u, v), m[0], m[1]))
    return lines, pts
def solve(q0, qp, lines, pts, lam=0.04, wpt=0.6):
    Pp = LM.ph(LM.Hq(qp), GRID); vis = inview(Pp)
    def f(p):
        H = LM.Hq(p.reshape(4, 2)); out = []
        for nm, P in lines:
            ax, val = LM.MODEL[nm]; a, b = ((val, -200), (val, CH + 200)) if ax == 'u' else ((-200, val), (CW + 200, val))
            pa, pb = LM.ph(H, np.array([a, b], float)); d = (pb - pa) / np.linalg.norm(pb - pa); n = np.array([-d[1], d[0]])
            out.append((P - pa) @ n)
        for (uv, xy, sc) in pts: out.append((LM.ph(H, np.array([uv], float))[0] - np.array(xy)) * wpt)
        out.append((LM.ph(H, GRID[vis]) - Pp[vis]).ravel() * lam)
        return np.concatenate(out)
    r = least_squares(f, np.float64(q0).ravel(), loss='soft_l1', f_scale=1.5, x_scale=5.0, max_nfev=400)
    fr = f(r.x); nl = sum(len(P) for _, P in lines)
    return r.x.reshape(4, 2), float(np.sqrt(np.mean(np.minimum(fr[:nl] ** 2, 100)))) if nl else None
def fit_frame(g, qp, sched=((22, 44), (10, 18), (6, 10), (4, 6)), skip=()):
    q = qp; info = None
    for R, S in sched:
        lines, pts = gather(g, q, R, S, skip)
        if len(lines) < 2 and len(pts) < 4: continue
        q, rms = solve(q, qp, lines, pts)
        info = ([nm for nm, _ in lines], len(pts), None if rms is None else round(rms, 2))
    return q, info
def overlay(n, q, t, info, path):
    img = frame(n, gray=False); H = LM.Hq(q)
    for nm in LM.MODEL:
        s0, s1 = LM.model_seg(nm); P = LM.ph(H, np.linspace(s0, s1, 50))
        cv2.polylines(img, [np.round(np.clip(P, -3000, 5000)).astype(np.int32)], False, (0, 255, 0) if info and nm in info[0] else (0, 160, 255), 2)
    P = LM.ph(H, np.linspace((85, 214), (381, 214), 30)); cv2.polylines(img, [np.round(np.clip(P, -3000, 5000)).astype(np.int32)], False, (255, 255, 0), 1)
    cv2.putText(img, f'{t:.2f} {info[1] if info else ""} {info[2] if info else ""}', (20, 60), 0, 1.6, (0, 255, 255), 3)
    cv2.imwrite(path, cv2.resize(img, None, fx=0.4, fy=0.4))
if __name__ == '__main__':
    times = [float(t) for t in sys.argv[1].split(',')]
    seed = json.load(open(sys.argv[2])); out = sys.argv[3]
    q1 = np.array(seed[-1][1:9], float).reshape(4, 2); q2 = np.array(seed[-2][1:9], float).reshape(4, 2) if len(seed) > 1 else None
    res = []
    for t in times:
        n = int(round(t * 25))
        if np.abs(frame(n) - frame(n - 1)).mean() < 3.0:
            res.append([t] + [round(float(v), 1) for v in q1.ravel()]); print(t, 'repeat', flush=True); json.dump(res, open(out, 'w')); continue
        qp = predict(q1, q2)
        q, info = fit_frame(frame(n).astype(np.float32), qp)
        q2, q1 = q1, q
        res.append([t] + [round(float(v), 1) for v in q.ravel()])
        print(t, info, np.round(q, 1).tolist(), flush=True)
        json.dump(res, open(out, 'w'))
        overlay(n, q, t, info, f'/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-ref/kc/cb-{t:.2f}.jpg')
