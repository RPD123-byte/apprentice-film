# Per-band strips on scan lines (handles twisting ribbons). spec JSON:
#  {"dir":"row"|"col", "ys":[a0,a1,step], "spine":[[s, c],...] (window centre per line), "half":H,
#   "bands":[[cls, s0, s1], ...] (each band tracked over lines s0..s1), "alias":{...}, "min":3, "src":"", "off":[0,0]}
# Output JS: [[cls, [[s, a, b], ...]], ...] — a/b the run's edges (at the ink-line centres) on each scan line.
import sys, json, numpy as np
spec = json.load(open(sys.argv[1]))
idx = np.load('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/classidx' + spec.get('src', '') + '.npy')
OX, OY = spec.get('off', [0, 0])
keys = ['cream', 'gold', 'orange', 'magenta', 'indigo', 'sky', 'ink', 'pinkL', 'lav', 'green', 'white', 'skin', 'brown', 'blue', 'teal', 'grey', 'yellow', 'peach', 'jacket']
short = dict(zip(keys, 'CYOPV._klgWsbBtrypj'))
alias = spec.get('alias', {'s': 'C', 'W': 'C', 'y': 'Y', 'k': 'P'})
H, W = idx.shape; col = spec.get('dir', 'row') == 'col'
S = np.array(spec['spine'], float); a0, a1, st = spec['ys']
lines = list(range(a0, a1 + 1, st))
def runs_at(s):
    c0 = np.interp(s, S[:, 0], S[:, 1]); lo, hi = int(c0 - spec['half']), int(c0 + spec['half'])
    seq = []
    for t in range(lo, hi + 1):
        X, Y = (t - OX, s - OY) if not col else (s - OX, t - OY)
        c = short[keys[idx[Y, X]]] if 0 <= X < W and 0 <= Y < H else ' '
        seq.append(alias.get(c, c))
    out = []; j = 0
    while j < len(seq):
        k = j
        while k < len(seq) and seq[k] == seq[j]: k += 1
        if k - j >= spec.get('min', 3): out.append((seq[j], lo + j, lo + k - 1))
        j = k
    m = []
    for r in out:
        if m and m[-1][0] == r[0] and r[1] - m[-1][2] <= 5: m[-1] = (r[0], m[-1][1], r[2])
        else: m.append(r)
    return m
R = {s: runs_at(s) for s in lines}
res = []
for bi, (cls, s0, s1, *hint) in enumerate(spec['bands']):
    prev = hint[0] if hint else None; pts = []
    for s in lines:
        if not (s0 <= s <= s1): continue
        cand = [(a, b) for c, a, b in R[s] if c == cls]
        if not cand: continue
        if prev is None: a, b = max(cand, key=lambda r: r[1] - r[0])
        else:
            near = [r for r in cand if abs((r[0] + r[1]) / 2 - prev) <= spec.get('jump', 40)]
            if not near: continue
            a, b = max(near, key=lambda r: r[1] - r[0])
        if prev is not None and abs((a + b) / 2 - prev) > spec.get('jump', 40): continue
        prev = (a + b) / 2; pts.append([s, round(a - 1.5, 1), round(b + 1.5, 1)])
    res.append([cls, pts])
    print(cls, ' '.join(f"{s}:{a:.0f}-{b:.0f}" for s, a, b in pts), file=sys.stderr)
print(json.dumps(res, separators=(',', ':')))
