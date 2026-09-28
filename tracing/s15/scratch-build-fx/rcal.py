import sys, json, glob, re, os, numpy as np, cv2
from rlib import *
from rmeas import parse, paint_value, unit_homog, measure, export
# rcal.py TAKE renderdir [damp] : per-face corner corrections from a render (render vs source, same fits)
take, rd = sys.argv[1], sys.argv[2]; damp = float(sys.argv[3]) if len(sys.argv) > 3 else 0.8
faces, frames = measure(take)
cp = f'{FX}/roto/{take}_corr.json'
corr = json.load(open(cp)) if os.path.exists(cp) else {}
def fit(pv, m, P):
    ys, xs = np.nonzero(m)
    if len(xs) < 400: return None
    if len(xs) > 20000:
        sel = np.linspace(0, len(xs) - 1, 20000).astype(int); xs = xs[sel]; ys = ys[sel]
    uv = cv2.perspectiveTransform(np.stack([xs, ys], 1)[None].astype(np.float64), unit_homog(P))[0]
    u = np.clip(uv[:, 0], 0, 1); v = np.clip(uv[:, 1], 0, 1)
    A = np.stack([(1 - u) * (1 - v), u * (1 - v), u * v, (1 - u) * v], 1)
    lam = 0.08 * len(xs); b = pv[ys, xs]
    return np.linalg.solve(A.T @ A + lam * np.eye(4), A.T @ b + lam * b.mean())
tot = []
for p in glob.glob(rd + '/frame-*.png'):
    t = float(re.search(r'at-([\d.]+)s', p).group(1)); f = int(round(t * 25))
    if f not in frames: continue
    R = cv2.imread(p, 0); S = src(f)
    pr = paint_value(R); ps = paint_value(S)
    rows = frames[f]
    idx = np.full((H, W), -1, np.int16)
    for i, r in enumerate(rows):
        P = np.array(r[1:9]).reshape(4, 2)
        cv2.fillPoly(idx, [np.round(P).astype(np.int32)], i)
    om = owlmask(f, 1.2)
    cf = corr.setdefault(str(f), {})
    for i, r in enumerate(rows):
        fid = r[0]; P = np.array(r[1:9]).reshape(4, 2)
        m = cv2.erode(((idx == i) & ~om).astype(np.uint8), np.ones((11, 11), np.uint8)).astype(bool)
        a = fit(ps, m, P); b = fit(pr, m, P)
        if a is None or b is None: continue
        d = (a - b) * damp
        old = np.array(cf.get(fid, [0, 0, 0, 0]))
        cf[fid] = np.clip(old + d, -0.45, 0.8).round(4).tolist()
        tot.append(np.abs(a - b).mean())
json.dump(corr, open(cp, 'w'))
print(take, 'mean |src-render| per corner (paint)', np.mean(tot) if tot else None, len(tot))
