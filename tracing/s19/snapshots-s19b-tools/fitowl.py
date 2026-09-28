# fitowl.py t1,t2,... [--scale] : per key time, search an extra (dx, dy[, s]) for the owl pose that minimises the
# un-graded MAE (1/4-res box filtered) in a box round the owl; prints the best adjust per key
import sys, json; sys.path.insert(0, '.')
from lab import *
ts = [float(v) for v in sys.argv[1].split(',')]; doscale = '--scale' in sys.argv
L = Lab(); F = 4; res = {}
for t in ts:
    S = ungr_small(t, F); h, w = S.shape
    L.js('(a) => S19.setSrc(a.a, a.w, a.h)', {'a': S.ravel().tolist(), 'w': w, 'h': h})
    o = L.devc('owlc', {'t': t}); al = o[:, :, 3] if o.shape[2] == 4 else None
    ys, xs = np.nonzero(al > 30)
    x0, y0, x1, y1 = xs.min() - 80, ys.min() - 80, xs.max() + 80, ys.max() + 80
    box = [int(max(0, x0 // F)), int(max(0, y0 // F)), int(min(w, x1 // F)), int(min(h, y1 // F))]
    key = f'{t:.2f}'
    sc = lambda a: L.js('(q) => S19.score(q.t, q.adj, q.box)', {'t': t, 'adj': {key: a}, 'box': box})
    best = [0, 0, 1]; bs = sc(best)
    base = bs
    for step in [16, 8, 4, 2]:
        improved = True
        while improved:
            improved = False
            cands = [[best[0] + dx, best[1] + dy, best[2]] for dx, dy in [(step, 0), (-step, 0), (0, step), (0, -step)]]
            if doscale: cands += [[best[0], best[1], best[2] * (1 + step / 200)], [best[0], best[1], best[2] / (1 + step / 200)]]
            for c in cands:
                v = sc(c)
                if v < bs - 1e-3: bs, best, improved = v, c, True
    res[key] = [best[0], best[1], round(best[2], 4)]
    print(f'{key} base {base:6.2f} -> {bs:6.2f}  adj {res[key]}', flush=True)
L.js('() => S19.setAdj(null)')
L.close()
print(json.dumps(res))
