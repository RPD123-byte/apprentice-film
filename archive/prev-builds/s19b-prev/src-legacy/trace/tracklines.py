# Track the card through the lift from its keylines (linemeas.robust), frame by frame: each frame's prediction is
# the previous fit plus a damped velocity; the predicted lines are refined (wide, then narrow) and solved.
# Repeated source frames hold the pose. Usage: tracklines.py t0,t1,... start_quad.json out.json [R]
import sys, json, numpy as np
import linemeas as LM
from common import frame
times = [float(t) for t in sys.argv[1].split(',')]
q = np.array(json.load(open(sys.argv[2])), float).reshape(4, 2)
out = sys.argv[3]; R1 = float(sys.argv[4]) if len(sys.argv) > 4 else 18
res = []; prev = q; prev2 = None
def lines_from(q):
    H = LM.Hq(q); r = []
    for nm in LM.MODEL:
        a, b = LM.model_seg(nm); P = LM.ph(H, np.array([a, b], float)); cs = LM.clip_seg(P[0], P[1])
        if cs is not None and np.linalg.norm(cs[1] - cs[0]) > 50: r.append((nm, (*cs[0], *cs[1])))
    return r
for t in times:
    n = int(round(t * 25))
    if np.abs(frame(n) - frame(n - 1)).mean() < 3.0:
        res.append([t] + [round(float(v), 1) for v in prev.ravel()]); print(t, 'repeat', flush=True); continue
    qp = prev if prev2 is None else prev + 0.6 * (prev - prev2)
    q, rms, names = LM.robust(t, lines_from(qp), qp, R=R1)
    if rms > 2.5 or len(names) < 5:
        q2, rms2, names2 = LM.robust(t, lines_from(prev), prev, R=R1 * 1.5)
        if rms2 < rms: q, rms, names = q2, rms2, names2
    import cv2
    img = frame(n, gray=False); H = LM.Hq(q)
    for nm in LM.MODEL:
        s0, s1 = LM.model_seg(nm); P = LM.ph(H, np.linspace(s0, s1, 50))
        cv2.polylines(img, [np.round(np.clip(P, -3000, 5000)).astype(np.int32)], False, (0, 255, 0) if nm in names else (0, 160, 255), 2)
    P = LM.ph(H, np.linspace((85, 214), (381, 214), 30)); cv2.polylines(img, [np.round(np.clip(P, -3000, 5000)).astype(np.int32)], False, (255, 255, 0), 1)
    cv2.putText(img, f'{t:.2f} rms {rms:.2f}', (20, 60), 0, 1.6, (0, 255, 255), 3)
    cv2.imwrite(f'/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-ref/kc/tl-{t:.2f}.jpg', cv2.resize(img, None, fx=0.4, fy=0.4))
    prev2, prev = prev, q
    res.append([t] + [round(float(v), 1) for v in q.ravel()])
    print(t, round(rms, 2), ','.join(names), np.round(q, 1).tolist(), flush=True)
    json.dump(res, open(out, 'w'))
