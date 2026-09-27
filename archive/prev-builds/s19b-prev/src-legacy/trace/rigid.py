# Rigid-card tracker for the lift (measurement only). The card is modelled as a rigid plane seen by a pinhole camera
# (focal F, principal point at the frame centre); its planar shape is fixed by back-projecting the measured static
# quad onto the static pose's plane, so only the 6-DOF pose changes per frame (the off-screen corners stay physical).
# Each frame: predict the pose (previous + damped velocity), then alternate (a) keyline refinement of every model
# line in view (linemeas.refine: the darkest keyline near the prediction with paper on the right side) and patch
# matches of the source's own standing card (patchtrack.match), and (b) a robust pose solve; windows shrink 18 → 4 px.
import sys, json, numpy as np, cv2
from scipy.optimize import least_squares
import linemeas as LM
import patchtrack as PT
from common import frame
CW, CH = 465, 648
CX, CY = 1103.0, 473.0
QS = np.float64([[1093.2, 86.9], [1578.4, 50.7], [1686.5, 802.5], [995.7, 774.1]])
def Kmat(F): return np.array([[F, 0, CX], [0, F, CY], [0, 0, 1.0]])
def setup(F):
    K = Kmat(F)
    obj = np.float64([[0, 0, 0], [CW, 0, 0], [CW, CH, 0], [0, CH, 0]])
    ok, rv, tv = cv2.solvePnP(obj, QS, K, None, flags=cv2.SOLVEPNP_IPPE)
    R, _ = cv2.Rodrigues(rv)
    Hp = K @ np.c_[R[:, 0], R[:, 1], tv.ravel()]          # plane (X, Y) -> frame
    # G: card units -> plane coordinates so that the static projection is exactly QS
    Hc = LM.Hq(QS)                                          # card units -> frame
    G = np.linalg.inv(Hp) @ Hc; G /= G[2, 2]
    return K, G, np.r_[rv.ravel(), tv.ravel()]
def H_of(K, G, p):
    R, _ = cv2.Rodrigues(p[:3].reshape(3, 1))
    return K @ np.c_[R[:, 0], R[:, 1], p[3:6]] @ G
def gather(g, H, R, S, qcard):
    lines = []
    for nm in LM.MODEL:
        s0, s1 = LM.model_seg(nm); P = LM.ph(H, np.array([s0, s1], float)); cs = LM.clip_seg(P[0], P[1])
        if cs is None or np.linalg.norm(cs[1] - cs[0]) < 50: continue
        sg = (*cs[0], *cs[1])
        r = LM.refine(g, sg, R=R, inner=LM.inner_dir(qcard, nm, sg), kind='paper' if nm[0] == 'p' else 'box')
        if r is not None: lines.append((nm, r[0]))
    pts = []
    for (u, v) in PT.PTS:
        m = PT.match(g, H, u, v, S=S)
        if m is not None and m[1] > 0.75: pts.append(((u, v), m[0], m[1]))
    return lines, pts
def residuals(K, G, p, lines, pts, wpt=0.5):
    H = H_of(K, G, p); out = []
    for nm, P in lines:
        ax, val = LM.MODEL[nm]; a, b = ((val, -200), (val, CH + 200)) if ax == 'u' else ((-200, val), (CW + 200, val))
        pa, pb = LM.ph(H, np.array([a, b], float)); d = (pb - pa) / np.linalg.norm(pb - pa); n = np.array([-d[1], d[0]])
        out.append((P - pa) @ n)
    for (uv, xy, sc) in pts:
        pr = LM.ph(H, np.array([uv], float))[0]; out.append((pr - np.array(xy)) * wpt)
    return np.concatenate(out) if out else np.zeros(1)
def fit_frame(g, K, G, p0, sched=((18, 40), (9, 16), (5, 8), (4, 6))):
    p = p0.copy(); info = None
    for R, S in sched:
        H = H_of(K, G, p); q = LM.ph(H, np.array([[0, 0], [CW, 0], [CW, CH], [0, CH]], float))
        lines, pts = gather(g, H, R, S, q)
        if len(lines) + len(pts) < 3: continue
        f = lambda pp: residuals(K, G, pp, lines, pts)
        r = least_squares(f, p, loss='soft_l1', f_scale=1.5, x_scale=np.r_[0.01, 0.01, 0.01, 5, 5, 5], max_nfev=300)
        p = r.x; res = f(p)
        info = (R, [nm for nm, _ in lines], len(pts), float(np.sqrt(np.mean(np.minimum(res ** 2, 100)))))
    return p, info
if __name__ == '__main__':
    F = float(sys.argv[1]); times = [float(t) for t in sys.argv[2].split(',')]; out = sys.argv[3]
    K, G, p = setup(F)
    res = []; prev = p; prev2 = None; ovd = '/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-ref/kc'
    for t in times:
        n = int(round(t * 25))
        if np.abs(frame(n) - frame(n - 1)).mean() < 3.0 and res:
            res.append(res[-1][:1] and [t] + res[-1][1:]); print(t, 'repeat', flush=True); continue
        pp = prev if prev2 is None else prev + 0.6 * (prev - prev2)
        g = frame(n).astype(np.float32)
        p, info = fit_frame(g, K, G, pp)
        prev2, prev = prev, p
        q = LM.ph(H_of(K, G, p), np.array([[0, 0], [CW, 0], [CW, CH], [0, CH]], float))
        res.append([t] + [round(float(v), 1) for v in q.ravel()] + [round(float(v), 5) for v in p])
        print(t, info, np.round(q, 1).tolist(), flush=True)
        json.dump(res, open(out, 'w'))
        img = frame(n, gray=False); H = H_of(K, G, p)
        for nm in LM.MODEL:
            s0, s1 = LM.model_seg(nm); P = LM.ph(H, np.linspace(s0, s1, 50))
            cv2.polylines(img, [np.round(np.clip(P, -3000, 5000)).astype(np.int32)], False, (0, 255, 0) if info and nm in info[1] else (0, 160, 255), 2)
        P = LM.ph(H, np.linspace((85, 214), (381, 214), 30)); cv2.polylines(img, [np.round(np.clip(P, -3000, 5000)).astype(np.int32)], False, (255, 255, 0), 1)
        cv2.putText(img, f'{t:.2f}', (20, 60), 0, 1.6, (0, 255, 255), 3)
        cv2.imwrite(f'{ovd}/rg-{t:.2f}.jpg', cv2.resize(img, None, fx=0.4, fy=0.4))
