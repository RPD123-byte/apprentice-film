# key-frame helper: predict the card at t from two measured key poses (linear in the corners), or take rough lines
# from a JSON argument; run linemeas.robust; save an overlay; store into keyposes.json when --save.
# kf.py T [--from t1,t2 | --q0 t1] [--lines '[["bL",[x0,y0,x1,y1]],...]'] [--R 20] [--save]
import sys, json, numpy as np, cv2, argparse
import linemeas as LM
from common import frame
ap = argparse.ArgumentParser(); ap.add_argument('t', type=float); ap.add_argument('--from', dest='frm'); ap.add_argument('--q0')
ap.add_argument('--lines'); ap.add_argument('--R', type=float, default=20); ap.add_argument('--save', action='store_true'); ap.add_argument('--skip', default='')
a = ap.parse_args()
KP = '/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-ref/keyposes.json'
kp = json.load(open(KP))
g = lambda k: np.array(kp[f'{float(k):.2f}'], float).reshape(4, 2)
if a.frm:
    t1, t2 = [float(v) for v in a.frm.split(',')]
    qp = g(t1) + (g(t2) - g(t1)) * (a.t - t1) / (t2 - t1)
else: qp = g(a.q0)
def lines_from(q):
    H = LM.Hq(q); r = []
    for nm in LM.MODEL:
        if nm in a.skip.split(','): continue
        s0, s1 = LM.model_seg(nm); P = LM.ph(H, np.array([s0, s1], float)); cs = LM.clip_seg(P[0], P[1])
        if cs is not None and np.linalg.norm(cs[1] - cs[0]) > 50: r.append((nm, (*cs[0], *cs[1])))
    return r
rough = [(n, tuple(s)) for n, s in json.loads(a.lines)] if a.lines else lines_from(qp)
q, rms, names = LM.robust(a.t, rough, qp, R=a.R, skip=a.skip.split(','))
print(a.t, 'rms', round(rms, 2), names, np.round(q, 1).tolist())
s = frame(int(round(a.t * 25)), gray=False)
H = LM.Hq(q); Hp = LM.Hq(qp)
for nm in LM.MODEL:
    s0, s1 = LM.model_seg(nm)
    for HH, col, w in ((Hp, (255, 0, 255), 1), (H, (0, 255, 0) if nm in names else (0, 160, 255), 2)):
        P = LM.ph(HH, np.linspace(s0, s1, 50)); cv2.polylines(s, [np.round(np.clip(P, -3000, 5000)).astype(np.int32)], False, col, w)
# text baseline check (u 85 .. 381 at v 215)
P = LM.ph(H, np.linspace((85, 214), (381, 214), 30)); cv2.polylines(s, [np.round(np.clip(P, -3000, 5000)).astype(np.int32)], False, (255, 255, 0), 1)
cv2.imwrite(f'/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-ref/kc/kf-{a.t:.2f}.jpg', cv2.resize(s[0:946, 250:2206], None, fx=0.6, fy=0.6))
if a.save:
    kp[f'{a.t:.2f}'] = [round(float(v), 1) for v in q.ravel()]
    json.dump(dict(sorted(kp.items())), open(KP, 'w'), indent=0); print('saved')
