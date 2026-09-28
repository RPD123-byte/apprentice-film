#!/usr/bin/env python3
# Refine each D-ring cell's page similarity around the previous builder's (1-decimal rounded) matrix: a, b within
# +-0.06, translation within +-90 px, masked NCC (variance-floored) at full res. Measurement only. Scratch.
import sys, json, numpy as np
sys.argv = ['x', '2818', 'stageA.png']
import ringmatch as R
from multiprocessing import Pool
def refine(k):
    c = R.cells[k]
    if c['lab'] != 0: return (k, None)
    a0, b0, tx0, d0, e0, ty0 = c['M']
    P = np.array(c['p'], np.float32).reshape(-1, 2); cc = P.mean(0)
    A = np.array([[a0, b0], [d0, e0]]); q0 = np.linalg.solve(A, cc - np.array([tx0, ty0]))
    best = (-2, None)
    for a in np.arange(a0 - 0.06, a0 + 0.061, 0.015):
        for b in np.arange(b0 - 0.06, b0 + 0.061, 0.015):
            s = np.hypot(a, b); th = np.arctan2(-b, a)
            # predicted stage point of the cell centre under this (a, b) with the old translation
            q = np.linalg.solve(np.array([[a, b], [-b, a]]), cc - np.array([tx0, ty0]))
            r = R.score(k, c['p'], s, th, 1.0, win=(q, 90))
            if r and r[0] > best[0]: best = (r[0], (s, th, r[1], r[2]))
    if best[1] is None: return (k, None)
    s, th, qs, cen = best[1]
    ct, sn = np.cos(th), np.sin(th)
    a, b, d, e = s * ct, -s * sn, s * sn, s * ct
    tx = cen[0] - (a * qs[0] + b * qs[1]); ty = cen[1] - (d * qs[0] + e * qs[1])
    return (k, (float(best[0]), [float(a), float(b), float(tx), float(d), float(e), float(ty)]))
if __name__ == '__main__':
    with Pool(6) as p: out = p.map(refine, range(len(R.cells)))
    res = {k: v for k, v in out}
    json.dump(res, open(f'{R.M}/ringrefine_{sys.argv[2].split(".")[0]}.json', 'w'))
    for k, v in sorted(res.items()):
        if v: print(k, round(v[0], 3), [round(x, 3) for x in v[1]], 'old', R.cells[k]['M'])
