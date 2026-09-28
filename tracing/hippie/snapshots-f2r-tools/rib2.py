# Ribbon boundaries from station scans. spec: {"step","lo","hi","spine":[[x,y]..],
#   "bands":[[cls, s0, s1, wlo, whi], ...] inner->outer (station range + normal-offset window per band),
#   "set": {"k": {"s": [a,b]}} overrides by band index, "min": 4}
# Output JS-ready JSON {cls:[...], b:[boundary point lists]} ; table on stderr.
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
st = list(np.arange(0, S[-1] + 1e-6, STEP))
bands = spec['bands']; nb = len(bands)
data = [dict() for _ in bands]
for s in st:
    p, n = frame(s); seq = []
    for o in range(LO, HI + 1):
        q = p + n * o; x, y = int(round(q[0])), int(round(q[1]))
        c = short[keys[idx[y, x]]] if 0 <= x < W and 0 <= y < H else ' '
        seq.append(alias.get(c, c))
    j = 0; runs = []
    while j < len(seq):
        k = j
        while k < len(seq) and seq[k] == seq[j]: k += 1
        runs.append((seq[j], j + LO, k - 1 + LO)); j = k
    for bi, (cls, s0, s1, wlo, whi) in enumerate(bands):
        if not (s0 <= s <= s1): continue
        rr = [(a0, a1) for c, a0, a1 in runs if c == cls and a1 - a0 + 1 >= spec.get('min', 4) and wlo <= (a0 + a1) / 2 <= whi]
        if rr:
            a0, a1 = max(rr, key=lambda r: r[1] - r[0]); data[bi][float(s)] = (a0 - 1.5, a1 + 1.5)
for k, m in spec.get('set', {}).items():
    for s, v in m.items():
        if v is None: data[int(k)].pop(float(s), None)
        else: data[int(k)][float(s)] = tuple(v)
I = []
for bi in range(nb):
    D = data[bi]; ks = sorted(D)
    if not ks: I.append(None); continue
    a = np.interp(st, ks, [D[k][0] for k in ks]); c = np.interp(st, ks, [D[k][1] for k in ks])
    I.append((a, c, [ks[0] <= s <= ks[-1] for s in st]))
B = np.full((nb + 1, len(st)), np.nan)
for j in range(len(st)):
    edges = [((I[b][0][j], I[b][1][j]) if I[b] and I[b][2][j] else None) for b in range(nb)]
    for k in range(nb + 1):
        L = edges[k - 1] if k > 0 else None; R = edges[k] if k < nb else None
        if L and R: B[k, j] = (L[1] + R[0]) / 2
        elif L: B[k, j] = L[1]
        elif R: B[k, j] = R[0]
    for k in range(nb + 1):
        if np.isnan(B[k, j]):
            for kk in list(range(k + 1, nb + 1)) + list(range(k - 1, -1, -1)):
                if not np.isnan(B[kk, j]): B[k, j] = B[kk, j]; break
    for k in range(1, nb + 1): B[k, j] = max(B[k, j], B[k - 1, j])
sm = spec.get('smooth', 2)
for _ in range(sm):
    for k in range(nb + 1):
        row = B[k].copy()
        for j in range(1, len(st) - 1):
            if not np.isnan(row[j - 1:j + 2]).any(): B[k, j] = 0.25 * row[j - 1] + 0.5 * row[j] + 0.25 * row[j + 1]
for j in range(len(st)):
    for k in range(1, nb + 1):
        if not np.isnan(B[k, j]): B[k, j] = max(B[k, j], B[k - 1, j])
print('      s: ' + ' '.join(f"{b[0]:>6}" for b in bands), file=sys.stderr)
for j, s in enumerate(st): print(f"  {s:5.0f}: " + ' '.join(f"{B[k, j]:6.1f}" for k in range(nb + 1)), file=sys.stderr)
out = []
good = [j for j in range(len(st)) if not np.isnan(B[:, j]).any()]
for k in range(nb + 1):
    pts = []
    for j in good:
        p, n = frame(st[j]); q = p + n * B[k, j]; pts.append([round(float(q[0])), round(float(q[1]))])
    out.append(pts)
print(json.dumps({'cls': [b[0] for b in bands], 'b': out}))
