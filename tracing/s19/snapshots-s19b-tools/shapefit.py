# shapefit.py t1,t2,... [--show out.jpg] [--iters N] [--head]: fit placement + the body's 8 radial factors (+ head size)
# of each key row's pose to the source silhouette (IoU, 1/2 res). Prints JSON overrides to paste into owl.js rows.
import sys, json; sys.path.insert(0, '.')
from lab import *
from silmask import srcmask, gcmask
from scipy.optimize import minimize
specs = [v.split(':') for v in sys.argv[1].split(',')]   # time:POSE[:xmax]
show = sys.argv[sys.argv.index('--show') + 1] if '--show' in sys.argv else None
iters = int(sys.argv[sys.argv.index('--iters') + 1]) if '--iters' in sys.argv else 250
dohead = '--head' in sys.argv
L = Lab(); res = {}; tiles = []
K = lambda q: float(1 + 0.4 * np.tanh(q / 0.4))
def adj_of(v):
    d = [float(v[0]), float(v[1]), float(1 + v[2])]
    over = {'body': {'k': [K(q) for q in v[3:11]]}}
    if dohead: over['head'] = {'k': [K(q) for q in v[11:19]]}
    return {'d': d, 'over': over}
for sp in specs:
    tt, key = sp[0], sp[1]; t = float(tt)
    if '--gc' in sys.argv:
        L.js('() => S19.setAdj(null)'); o0 = L.devc('owlc', {'t': t}); S = gcmask(t, (o0[:, :, 3] > 100).astype(np.uint8))
    else: S = srcmask(t, xmax=int(sp[2]) if len(sp) > 2 else None)
    S2 = cv2.resize(S, (1103, 473), interpolation=cv2.INTER_NEAREST)
    L.js('(a) => S19.setMask(a.a, a.w, a.h)', {'a': S2.ravel().tolist(), 'w': 1103, 'h': 473})
    f = lambda v: -L.js('(q) => S19.iou(q.t, q.adj)', {'t': t, 'adj': {key: adj_of(v), '__nofit': 1}}) + 0.03 * float(np.mean(np.abs(np.tanh(np.array(v[3:]) / 0.4))))
    n = 19 if dohead else 11
    x0 = np.zeros(n)
    base = -f(x0)
    iou_of = lambda v: L.js('(q) => S19.iou(q.t, q.adj)', {'t': t, 'adj': {key: adj_of(v), '__nofit': 1}})
    # simplex scaled: 12 px, 4 %, 8 % radial
    sim = [x0] + [x0 + np.eye(n)[i] * (12 if i < 2 else 0.04 if i == 2 else 0.08) for i in range(n)]
    r = minimize(f, x0, method='Nelder-Mead', options={'maxfev': iters, 'initial_simplex': np.array(sim), 'xatol': 0.5, 'fatol': 1e-4})
    a = adj_of(r.x); a['d'] = [round(a['d'][0], 1), round(a['d'][1], 1), round(a['d'][2], 4)]
    for k in a['over']: a['over'][k]['k'] = [round(q, 3) for q in a['over'][k]['k']]
    res[key] = a
    print(f'{t:.2f} {key} IoU {base:.3f} -> {iou_of(r.x):.3f}  ({r.nfev} evals)', flush=True)
    if show:
        L.js('(a) => S19.setAdj(a)', {key: a, '__nofit': 1}); o = L.devc('owlc', {'t': t}); R = (o[:, :, 3] > 100).astype(np.uint8)
        im = src(t).copy()
        for m, col in [(S, (0, 255, 0)), (R, (0, 0, 255))]:
            cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(im, cs, -1, col, 2)
        ys, xs = np.nonzero(S | R); x0_, x1_ = max(0, xs.min() - 30), min(2206, xs.max() + 30); y0_, y1_ = max(0, ys.min() - 30), min(946, ys.max() + 30)
        c = cv2.resize(im[y0_:y1_, x0_:x1_], (400, int(400 * (y1_ - y0_) / (x1_ - x0_)))); cv2.putText(c, f'{t:.2f} {key}', (4, 16), 0, 0.5, (0, 255, 255), 1); tiles.append(c)
L.js('() => S19.setAdj(null)'); L.close()
print(json.dumps(res))
if show:
    H = max(t.shape[0] for t in tiles); tiles = [np.vstack([t, np.zeros((H - t.shape[0], 400, 3), np.uint8)]) for t in tiles]
    rows = [np.hstack(tiles[i:i + 5] + [np.zeros((H, 400, 3), np.uint8)] * (5 - len(tiles[i:i + 5]))) for i in range(0, len(tiles), 5)]
    cv2.imwrite(show, np.vstack(rows))
