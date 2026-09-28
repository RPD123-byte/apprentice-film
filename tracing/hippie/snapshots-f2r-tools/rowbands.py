# Ribbon band boundaries on scan lines (rows, or columns with "dir":"col"). spec JSON:
#  {"dir":"row", "ys":[y0,y1,step], "spine":[[y, xc], ...] (centre x per row, interpolated), "half": 150,
#   "order":"CYOPV", "alias":{...}, "min":3, "drop":{"k":[rows]}, "keep":[[ymin,ymax],...] }
# For each scan line: runs of classes inside [xc-half, xc+half]; greedy in-order match of the band sequence
# (bands may be missing at the ends); boundary k = midpoint of the ink gap between band k-1 and band k.
# Output: {cls, b: [[ [x,y], ...] per boundary]} with NaN rows interpolated, light smoothing.
import sys, json, numpy as np
spec = json.load(open(sys.argv[1]))
idx = np.load('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/classidx' + spec.get('src', '') + '.npy')
OX, OY = spec.get('off', [0, 0])
keys = ['cream', 'gold', 'orange', 'magenta', 'indigo', 'sky', 'ink', 'pinkL', 'lav', 'green', 'white', 'skin', 'brown', 'blue', 'teal', 'grey', 'yellow', 'peach', 'jacket']
short = dict(zip(keys, 'CYOPV._klgWsbBtrypj'))
alias = spec.get('alias', {'s': 'C', 'W': 'C', 'y': 'Y', 'p': 'O', 'k': 'P'})
order = spec['order']; nb = len(order)
H, W = idx.shape
a0, a1, st = spec['ys']
col = spec.get('dir', 'row') == 'col'
S = np.array(spec['spine'], float)
rows = list(range(a0, a1 + 1, st))
B = np.full((nb + 1, len(rows)), np.nan)
for ri, y in enumerate(rows):
    xc = np.interp(y, S[:, 0], S[:, 1]); lo, hi = int(xc - spec['half']), int(xc + spec['half'])
    seq = []
    for x in range(lo, hi + 1):
        X, Y = (x - OX, y - OY) if not col else (y - OX, x - OY)
        c = short[keys[idx[Y, X]]] if 0 <= X < W and 0 <= Y < H else ' '
        seq.append(alias.get(c, c))
    runs = []; j = 0
    while j < len(seq):
        k = j
        while k < len(seq) and seq[k] == seq[j]: k += 1
        if k - j >= spec.get('min', 3) and seq[j] in order: runs.append((seq[j], lo + j, lo + k - 1))
        j = k
    # merge consecutive runs of the same class separated by short gaps
    m = []
    for r in runs:
        if m and m[-1][0] == r[0] and r[1] - m[-1][2] <= 6: m[-1] = (r[0], m[-1][1], r[2])
        else: m.append(r)
    # in-order greedy match: find the longest subsequence of m matching a contiguous piece of order
    best = None
    for s0 in range(nb):
        pos = s0; got = []
        for r in m:
            if pos < nb and r[0] == order[pos]: got.append((pos, r)); pos += 1
            elif got and r[0] == order[got[-1][0]]: got[-1] = (got[-1][0], (r[0], got[-1][1][1], r[2]))
        if got and (best is None or len(got) > len(best)): best = got
    if not best: continue
    for n, (p, r) in enumerate(best):
        if n == 0: B[p, ri] = r[1] - 1.5
        if n == len(best) - 1: B[p + 1, ri] = r[2] + 1.5
        if n > 0:
            pr = best[n - 1][1]; B[p, ri] = (pr[2] + r[1]) / 2
for k, rs in spec.get('drop', {}).items():
    for y in rs:
        if y in rows: B[int(k), rows.index(y)] = np.nan
for k, m in spec.get('set', {}).items():
    for y, v in m.items():
        if int(y) in rows: B[int(k), rows.index(int(y))] = v
# interpolate gaps per boundary (only inside its measured range), then smooth
ys = np.array(rows, float)
for k in range(nb + 1):
    ok = ~np.isnan(B[k])
    if ok.sum() >= 2:
        r0, r1 = np.nonzero(ok)[0][[0, -1]]
        B[k, r0:r1 + 1] = np.interp(ys[r0:r1 + 1], ys[ok], B[k, ok])
for _ in range(spec.get('smooth', 1)):
    for k in range(nb + 1):
        row = B[k].copy()
        for j in range(1, len(rows) - 1):
            if not np.isnan(row[j - 1:j + 2]).any(): B[k, j] = 0.25 * row[j - 1] + 0.5 * row[j] + 0.25 * row[j + 1]
# fill boundaries missing at the ends by collapsing onto the neighbour (bands taper out)
for j in range(len(rows)):
    for k in range(nb + 1):
        if np.isnan(B[k, j]):
            for kk in list(range(k + 1, nb + 1)) + list(range(k - 1, -1, -1)):
                if not np.isnan(B[kk, j]): B[k, j] = B[kk, j]; break
good = [j for j in range(len(rows)) if not np.isnan(B[:, j]).any()]
print('   y: ' + ' '.join(f"{c:>6}" for c in order), file=sys.stderr)
for j in range(len(rows)): print(f"{rows[j]:5d}: " + ' '.join(f"{B[k, j]:6.1f}" for k in range(nb + 1)), file=sys.stderr)
out = []
for k in range(nb + 1):
    out.append([[round(float(B[k, j]), 1), rows[j]] if not col else [rows[j], round(float(B[k, j]), 1)] for j in good])
print(json.dumps({'cls': order, 'b': out}))
