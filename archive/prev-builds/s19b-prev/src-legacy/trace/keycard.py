# measure key frames of the card lift from rough keyline positions (read off gridded source frames) and save an
# overlay per frame for checking. Usage: keycard.py keys.json out.json ovdir
import sys, json, numpy as np, cv2
import linemeas as LM
from common import frame
keys = json.load(open(sys.argv[1])); out = sys.argv[2]; ovd = sys.argv[3]
old = {round(r[0], 2): r[1:] for r in json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-ref/cardtab0.json'))}
res = {}
try: res = {float(k): v for k, v in json.load(open(out)).items()}
except Exception: pass
for ks, spec in keys.items():
    t = float(ks)
    q0 = np.array(spec['q0'] if 'q0' in spec else (res[spec['from']] if 'from' in spec else old[round(t, 2)]), float).reshape(4, 2)
    rough = [(nm, tuple(seg)) for nm, seg in spec['lines']]
    q, rms, L = LM.measure(t, rough, q0, R=spec.get('R', 12))
    res[t] = [round(float(v), 1) for v in q.ravel()]
    print(t, 'rms', round(rms, 2), L, np.round(q, 1).tolist())
    s = frame(int(round(t * 25)), gray=False)
    H = LM.Hq(q)
    for nm, (ax, val) in LM.MODEL.items():
        a, b = ((val, 0), (val, LM.CH)) if ax == 'u' else ((0, val), (LM.CW, val))
        if nm in ('btn',): a, b = (LM.A['x0'], val), (LM.A['x1'], val)
        if nm == 'div': a, b = (val, LM.A['btnY']), (val, LM.A['y1'])
        if nm in ('bL', 'bR'): a, b = (val, LM.A['y0']), (val, LM.A['y1'])
        if nm in ('bT', 'bB'): a, b = (LM.A['x0'], val), (LM.A['x1'], val)
        P = LM.ph(H, np.linspace(a, b, 60))
        cv2.polylines(s, [np.round(np.clip(P, -3000, 5000)).astype(np.int32)], False, (0, 255, 0) if nm in dict(L) else (0, 160, 255), 1)
    for nm, seg in rough: cv2.line(s, (int(seg[0]), int(seg[1])), (int(seg[2]), int(seg[3])), (255, 0, 255), 1)
    cv2.imwrite(f'{ovd}/kc-{t:.2f}.jpg', s[0:900, 300:2000])
json.dump({f'{k:.2f}': v for k, v in sorted(res.items())}, open(out, 'w'), indent=0)
