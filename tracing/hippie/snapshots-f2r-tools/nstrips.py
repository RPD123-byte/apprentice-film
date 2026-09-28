# Per-band strips on normals to a spine (robust for twisting ribbons at any angle). spec JSON:
#  {"spine":[[x,y],...], "step":12, "lo":-80, "hi":80, "bands":[[cls, s0, s1, hint_offset?], ...], "alias":{}, "min":3,
#   "jump":25, "src":"", "off":[0,0]}
# Output: [[cls, [[s, xa, ya, xb, yb], ...]], ...]  (edges at ink-line centres, robust-smoothed along s)
import sys, json, numpy as np
spec = json.load(open(sys.argv[1]))
idx = np.load('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/classidx' + spec.get('src', '') + '.npy')
OX, OY = spec.get('off', [0, 0])
keys = ['cream', 'gold', 'orange', 'magenta', 'indigo', 'sky', 'ink', 'pinkL', 'lav', 'green', 'white', 'skin', 'brown', 'blue', 'teal', 'grey', 'yellow', 'peach', 'jacket']
short = dict(zip(keys, 'CYOPV._klgWsbBtrypj'))
alias = spec.get('alias', {'s': 'C', 'W': 'C', 'y': 'Y', 'k': 'P'})
H, W = idx.shape
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
st = np.arange(0, S[-1] + 1e-6, spec['step'])
RUNS = {}
for s in st:
    p, n = frame(s); seq = []
    for o in range(spec['lo'], spec['hi'] + 1):
        q = p + n * o; x, y = int(round(q[0])) - OX, int(round(q[1])) - OY
        c = short[keys[idx[y, x]]] if 0 <= x < W and 0 <= y < H else ' '
        seq.append(alias.get(c, c))
    out = []; j = 0
    while j < len(seq):
        k = j
        while k < len(seq) and seq[k] == seq[j]: k += 1
        if k - j >= spec.get('min', 3): out.append((seq[j], spec['lo'] + j, spec['lo'] + k - 1))
        j = k
    m = []
    for r in out:
        if m and m[-1][0] == r[0] and r[1] - m[-1][2] <= 5: m[-1] = (r[0], m[-1][1], r[2])
        else: m.append(r)
    RUNS[float(s)] = m
def robust(v, w=3):
    v = np.array(v, float); out = v.copy()
    for i in range(len(v)):
        mm = np.median(v[max(0, i - w):i + w + 1])
        if abs(v[i] - mm) > 4: out[i] = mm
    for _ in range(spec.get('smooth', 2)):
        o2 = out.copy()
        for i in range(1, len(v) - 1): o2[i] = 0.25 * out[i - 1] + 0.5 * out[i] + 0.25 * out[i + 1]
        out = o2
    return out
tracks = []
for cls, s0, s1, *hint in spec['bands']:
    prev = hint[0] if hint else None; got = []
    for s in st:
        if not (s0 <= s <= s1): continue
        cand = [(a, b) for c, a, b in RUNS[float(s)] if c == cls]
        if prev is not None: cand = [r for r in cand if abs((r[0] + r[1]) / 2 - prev) <= spec.get('jump', 25)]
        if not cand: continue
        a, b = max(cand, key=lambda r: r[1] - r[0]); prev = (a + b) / 2; got.append((s, a - 1.5, b + 1.5))
    if len(got) < 2: continue
    ss = [g[0] for g in got]; A = robust([g[1] for g in got]); B = robust([g[2] for g in got])
    tracks.append([cls, dict(zip(ss, [[a, b] for a, b in zip(A, B)]))])
# snap neighbouring bands on each station (close the sky gaps the independent smoothing leaves)
for s in st:
    pres = sorted([(T[1][s][0], i) for i, T in enumerate(tracks) if s in T[1]])
    for (a1, i), (a2, j) in zip(pres, pres[1:]):
        bi = tracks[i][1][s][1]; aj = tracks[j][1][s][0]
        if -3 < aj - bi < spec.get('snap', 9): m = (bi + aj) / 2; tracks[i][1][s][1] = m; tracks[j][1][s][0] = m
res = []
for cls, D in tracks:
    rows = []
    for s in sorted(D):
        a, b = D[s]; p, n = frame(s); qa = p + n * a; qb = p + n * b
        rows.append([round(float(s)), round(float(qa[0]), 1), round(float(qa[1]), 1), round(float(qb[0]), 1), round(float(qb[1]), 1)])
    res.append([cls, rows])
print(json.dumps(res, separators=(',', ':')))
