# silfit.py t1,t2,... [--scale] [--show out.jpg]: fit an extra (dx, dy, s) per key row to maximise silhouette IoU
import sys, json; sys.path.insert(0, '.')
from lab import *
from silmask import srcmask
ts = [float(v) for v in sys.argv[1].split(',')]; doscale = '--scale' in sys.argv
show = sys.argv[sys.argv.index('--show') + 1] if '--show' in sys.argv else None
L = Lab(); res = {}; tiles = []
def rmask(t, adj):
    L.js('(a) => S19.setAdj(a)', adj)
    o = L.devc('owlc', {'t': t}); return (o[:, :, 3] > 100).astype(np.uint8)
for t in ts:
    S = srcmask(t); key = f'{t:.2f}'
    iou = lambda a: (lambda R: (R & S).sum() / max(1, (R | S).sum()))(rmask(t, {key: a}))
    best = [0, 0, 1]; bs = iou(best); base = bs
    for step in [16, 8, 4, 2]:
        improved = True
        while improved:
            improved = False
            cands = [[best[0] + dx, best[1] + dy, best[2]] for dx, dy in [(step, 0), (-step, 0), (0, step), (0, -step)]]
            if doscale: cands += [[best[0], best[1], round(best[2] * (1 + step / 200), 4)], [best[0], best[1], round(best[2] / (1 + step / 200), 4)]]
            for c in cands:
                v = iou(c)
                if v > bs + 1e-4: bs, best, improved = v, c, True
    res[key] = best
    print(f'{key} IoU {base:.3f} -> {bs:.3f}  adj {best}', flush=True)
    if show:
        R = rmask(t, {key: best}); im = src(t).copy()
        for m, col in [(S, (0, 255, 0)), (R, (0, 0, 255))]:
            cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(im, cs, -1, col, 2)
        ys, xs = np.nonzero(S | R); x0, x1 = max(0, xs.min() - 30), min(2206, xs.max() + 30); y0, y1 = max(0, ys.min() - 30), min(946, ys.max() + 30)
        c = cv2.resize(im[y0:y1, x0:x1], (400, int(400 * (y1 - y0) / (x1 - x0)))); cv2.putText(c, key, (4, 16), 0, 0.5, (0, 255, 255), 1); tiles.append(c)
L.js('() => S19.setAdj(null)'); L.close()
print(json.dumps(res))
if show:
    H = max(t.shape[0] for t in tiles); tiles = [np.vstack([t, np.zeros((H - t.shape[0], 400, 3), np.uint8)]) for t in tiles]
    rows = [np.hstack(tiles[i:i + 5] + [np.zeros((H, 400, 3), np.uint8)] * (5 - len(tiles[i:i + 5]))) for i in range(0, len(tiles), 5)]
    cv2.imwrite(show, np.vstack(rows))
