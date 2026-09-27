# Post-pass on the lift table (measurement only): the direct alignment pins the card's upper part (text, box, smiley)
# but its lower part is mostly behind the owl, so the lower edges drift. Here the upper part is kept (a grid of
# its projected points, v <= 420 units, as soft points) and the paper's right and bottom keylines (and the left one)
# are re-measured on the frame near a second prediction (the fix-1 table, whose lower edges were fitted to the
# paper mask), then one homography is solved from both.
import sys, json, numpy as np, cv2
from scipy.optimize import least_squares
import linemeas as LM
LM.OUTMAX = 165
from common import frame
upper = {f'{r[0]:.2f}': np.array(r[1:9], float).reshape(4, 2) for p in sys.argv[1].split(',') for r in json.load(open(p))}
old = {f'{r[0]:.2f}': np.array(r[1:9], float).reshape(4, 2) for r in json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-ref/cardtab0.json'))}
out = sys.argv[2]
GRID = np.array([(u, v) for u in np.linspace(40, 425, 8) for v in np.linspace(300, 430, 4)], float)
res = []
for t in sorted(upper, key=float):
    qd = upper[t]; n = int(round(float(t) * 25))
    if float(t) < 61.7 or t not in old:
        res.append([float(t)] + [round(float(v), 1) for v in qd.ravel()] * 2); continue
    g = frame(n)
    Pup = LM.ph(LM.Hq(qd), GRID)
    vis = (Pup[:, 0] > 5) & (Pup[:, 0] < 2200) & (Pup[:, 1] > 5) & (Pup[:, 1] < 940)
    lines = []
    for nm, qsrc, R in (('pR', old[t], 30), ('pB', old[t], 30), ('pL', qd, 8)):
        H = LM.Hq(qsrc); s0, s1 = LM.model_seg(nm)
        if nm == 'pB': s0 = (200, s0[1])            # only the right half of the bottom edge shows beside the owl
        P = LM.ph(H, np.array([s0, s1], float)); cs = LM.clip_seg(P[0], P[1])
        if cs is None or np.linalg.norm(cs[1] - cs[0]) < 40: continue
        sg = (*cs[0], *cs[1])
        r = LM.refine(g, sg, R=R, inner=LM.inner_dir(qsrc, nm, sg), kind='paper')
        if r is not None and len(r[0]) >= 6: lines.append((nm, r[0]))
    def f(p):
        H = LM.Hq(p.reshape(4, 2)); o = [(LM.ph(H, GRID[vis]) - Pup[vis]).ravel() * 0.7]
        for nm, P in lines:
            ax, val = LM.MODEL[nm]; a, b = ((val, -200), (val, LM.CH + 200)) if ax == 'u' else ((-200, val), (LM.CW + 200, val))
            pa, pb = LM.ph(H, np.array([a, b], float)); d = (pb - pa) / np.linalg.norm(pb - pa); nn = np.array([-d[1], d[0]])
            o.append((P - pa) @ nn)
        return np.concatenate(o)
    r = least_squares(f, qd.ravel(), loss='soft_l1', f_scale=2.0, x_scale=5.0, max_nfev=500)
    q = r.x.reshape(4, 2)
    per = LM.per_line(q, lines)
    up_err = np.sqrt(np.mean(np.sum((LM.ph(LM.Hq(q), GRID[vis]) - Pup[vis]) ** 2, 1)))
    res.append([float(t)] + [round(float(v), 1) for v in qd.ravel()] + [round(float(v), 1) for v in q.ravel()])
    print(t, 'lines', {k: round(v, 1) for k, v in per.items()}, 'upper shift rms', round(float(up_err), 1), 'BR', np.round(q[2], 1).tolist(), 'BL', np.round(q[3], 1).tolist(), flush=True)
    img = frame(n, gray=False); H1 = LM.Hq(qd); H2 = LM.Hq(q)
    def F(uv):
        uv = np.array(uv, float); w = np.clip((uv[:, 1] - 300) / 250, 0, 1); w = w * w * (3 - 2 * w)
        return LM.ph(H1, uv) * (1 - w[:, None]) + LM.ph(H2, uv) * w[:, None]
    for nm in LM.MODEL:
        s0, s1 = LM.model_seg(nm); P = F(np.linspace(s0, s1, 50))
        cv2.polylines(img, [np.round(np.clip(P, -3000, 5000)).astype(np.int32)], False, (0, 255, 0), 2)
    cv2.putText(img, t, (20, 60), 0, 1.6, (0, 255, 255), 3)
    cv2.imwrite(f'/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-ref/kc/lf-{t}.jpg', cv2.resize(img, None, fx=0.4, fy=0.4))
json.dump(res, open(out, 'w'))
