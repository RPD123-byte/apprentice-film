# Build ribbon band polygons from station scans (measurement -> sparse edge lists for hippie.js).
# spec JSON: {"name":..., "step":40, "lo":-90, "hi":90, "spine":[[x,y],...], "bands":"VPOYC",
#             "keep": {"V":[s0,s1], ...} (station range per band, optional), "min": 4}
# Output: JS literal {bands:[[cls, [[xa,ya],...], [[xb,yb],...]], ...]} - edge A = inner side (negative normal).
import sys, json, numpy as np
idx = np.load('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/classidx.npy')
keys = ['cream', 'gold', 'orange', 'magenta', 'indigo', 'sky', 'ink', 'pinkL', 'lav', 'green', 'white', 'skin', 'brown', 'blue', 'teal', 'grey', 'yellow', 'peach', 'jacket']
short = dict(zip(keys, 'CYOPV._klgWsbBtrypj'))
H, W = idx.shape
spec = json.load(open(sys.argv[1]))
alias = spec.get('alias', {'s': 'C', 'W': 'C', 'y': 'Y', 'p': 'O'})
STEP, LO, HI = spec['step'], spec['lo'], spec['hi']
def cr(pts, per=40):
    n = len(pts); out = []
    P = lambda i: pts[max(0, min(n - 1, i))]
    for i in range(n - 1):
        p0, p1, p2, p3 = P(i - 1), P(i), P(i + 1), P(i + 2)
        for j in range(per):
            t = j / per; t2 = t * t; t3 = t2 * t
            out.append([0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3) for k in (0, 1)])
    out.append(list(pts[-1])); return np.array(out)
C = cr(spec['spine']); seg = np.linalg.norm(np.diff(C, axis=0), axis=1); S = np.concatenate([[0], np.cumsum(seg)])
def frame(s):
    i = int(min(len(C) - 2, max(0, np.searchsorted(S, s) - 1)))
    u = (s - S[i]) / max(1e-6, seg[i]); p = C[i] + (C[i + 1] - C[i]) * u
    d = C[i + 1] - C[i]; d /= np.linalg.norm(d); return p, np.array([-d[1], d[0]])
stations = np.arange(0, S[-1] + 1e-6, STEP)
data = {b: {} for b in spec['bands']}
for s in stations:
    p, n = frame(s)
    seq = []
    for o in range(LO, HI + 1):
        q = p + n * o; x, y = int(round(q[0])), int(round(q[1]))
        c = short[keys[idx[y, x]]] if 0 <= x < W and 0 <= y < H else ' '
        seq.append(alias.get(c, c))
    j = 0; runs = []
    while j < len(seq):
        k = j
        while k < len(seq) and seq[k] == seq[j]: k += 1
        runs.append((seq[j], j + LO, k - 1 + LO)); j = k
    for b in spec['bands']:
        kr = spec.get('keep', {}).get(b)
        if kr and not (kr[0] <= s <= kr[1]): continue
        win = spec.get('win', {}).get(b)
        rr = [(a0, a1) for c, a0, a1 in runs if c == b and a1 - a0 + 1 >= spec.get('min', 4) and (not win or (win[0] <= (a0 + a1) / 2 <= win[1]))]
        if rr:
            a0, a1 = max(rr, key=lambda r: r[1] - r[0]); data[b][float(s)] = (a0 - 1.5, a1 + 1.5)
# report offsets table
print('// stations:', ' '.join(f"{s:.0f}" for s in stations), file=sys.stderr)
for b in spec['bands']:
    print(b, ' '.join(f"{s:.0f}:{a:.0f}/{c:.0f}" for s, (a, c) in sorted(data[b].items())), file=sys.stderr)
out = []
for b in spec['bands']:
    D = data[b]
    if len(D) < 2: continue
    ss = sorted(D)
    A = []; B = []
    for s in ss:
        p, n = frame(s); a, c = D[s]
        A.append([round(float(v), 1) for v in p + n * a]); B.append([round(float(v), 1) for v in p + n * c])
    out.append([b, A, B])
print(json.dumps(out))
