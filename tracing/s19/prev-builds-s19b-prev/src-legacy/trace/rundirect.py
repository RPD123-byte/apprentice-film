# Sequential direct refinement over a range of frames (see direct.py). Seeds: rows [t, 8 corners] (the last two
# seed the prediction); a frame that has a key pose (keyposes.json) starts from it instead of the prediction.
# Usage: rundirect.py t0,t1,... seeds.json out.json [--nokeys] [--vmax V]
import sys, json, numpy as np, cv2
import linemeas as LM, direct as DR, combo as CB
from common import frame
times = [float(t) for t in sys.argv[1].split(',')]
seed = json.load(open(sys.argv[2])); out = sys.argv[3]
vmax = float(sys.argv[sys.argv.index('--vmax') + 1]) if '--vmax' in sys.argv else 440
kp = {} if '--nokeys' in sys.argv else json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-ref/keyposes.json'))
q1 = np.array(seed[-1][1:9], float).reshape(4, 2); q2 = np.array(seed[-2][1:9], float).reshape(4, 2) if len(seed) > 1 else None
res = []
for t in times:
    n = int(round(t * 25))
    if np.abs(frame(n) - frame(n - 1)).mean() < 3.0:
        res.append([t] + [round(float(v), 1) for v in q1.ravel()]); print(t, 'repeat', flush=True); json.dump(res, open(out, 'w')); continue
    key = f'{t:.2f}'
    qp = np.array(kp[key], float).reshape(4, 2) if key in kp else CB.predict(q1, q2, damp=0.8)
    q, info = DR.refine(n, qp, vmax=vmax, levels=((16, 5), (8, 4), (4, 3), (2, 2), (0.8, 2)))
    F = np.array([(85, 215), (380, 215), (44.8, 153.8), (424, 153.8)], float)
    d = np.hypot(*(LM.ph(LM.Hq(q), F) - LM.ph(LM.Hq(qp), F)).T)
    q2, q1 = q1, q
    res.append([t] + [round(float(v), 1) for v in q.ravel()])
    print(t, 'key' if key in kp else 'pred', info, 'moved', np.round(d, 1).tolist(), np.round(q, 1).tolist(), flush=True)
    json.dump(res, open(out, 'w'))
    CB.overlay(n, q, t, (list(LM.MODEL), info[-1], ''), f'/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-ref/kc/dr-{t:.2f}.jpg')
