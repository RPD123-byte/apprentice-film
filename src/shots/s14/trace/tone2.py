# tone2.py fills.json renderdir tone2.js [--iter] : per-fill tone gain per source frame of the dolly (fix pass 1).
# Maps every fill polygon (rec.mjs; the floor's tone zones included) into each rendered frame with its layer's dolly
# depth (polygons clipped where they pass behind the camera), paints them back to front so later fills and nearer
# layers hide earlier ones, masks the owl, and compares mean luma render vs source over each fill's visible pixels.
# The ratio is folded into ../tone2.js (FT.g[layer][id][k], id = fill index + 1, k = frame 40.00 + 0.04 k).
# Only scalars per fill and frame are stored; no pixels.
import json, sys, cv2, numpy as np, glob, re, os
F = json.load(open(sys.argv[1])); rd = sys.argv[2]; outp = sys.argv[3]
C = np.array([1104.5, 642.9])
DOLLY = [0, 0.03, 0.06, 0.091, 0.1221, 0.1714, 0.2052, 0.2395, 0.2726, 0.3076, 0.3413, 0.3769, 0.4122, 0.4495, 0.4857, 0.5223, 0.549, 0.549, 0.57]
TIMES = [round(40.0 + 0.04 * k, 2) for k in range(17)]
planes = {L['name']: L['plane'] for L in F['layers']}
order = [L['name'] for L in F['layers']]
BK = {}
for l in open(os.path.join(os.path.dirname(__file__), '../back.js')):
    for m in re.finditer(r'\[(\d\d\.\d\d), ([\d.]+), (\d+), ([\d.]+),', l): BK[round(float(m.group(1)), 2)] = (float(m.group(2)), int(m.group(3)), float(m.group(4)))
DD = {16: 0.010}
DCY = [[40.0, 626], [40.2, 624], [40.32, 614], [40.44, 614], [40.52, 608], [40.6, 600], [40.64, 597.5], [40.72, 596]]
def cyat(t): return float(np.interp(t, [a for a, b in DCY], [b for a, b in DCY]))
def clip(poly, pl, d, eps=0.06):
    # keep the part with 1 - d*w >= eps, w = a x + b y + c
    if d <= 0: return poly
    f = lambda p: 1 - d * (pl[0] * p[0] + pl[1] * p[1] + pl[2]) - eps
    out = []
    n = len(poly)
    for i in range(n):
        P, Q = poly[i], poly[(i + 1) % n]; fp, fq = f(P), f(Q)
        if fp >= 0: out.append(P)
        if (fp >= 0) != (fq >= 0):
            t = fp / (fp - fq); out.append([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t])
    return out
def mapp(pts, pl, d, Cc):
    p = np.array(pts, float); w = pl[0] * p[:, 0] + pl[1] * p[:, 1] + pl[2]
    kx = pl[3] if len(pl) > 3 else 1; ky = pl[4] if len(pl) > 4 else 1
    sx = 1 / np.maximum(0.02, 1 - d * w * kx); sy = 1 / np.maximum(0.02, 1 - d * w * ky)
    return np.stack([Cc[0] + (p[:, 0] - Cc[0]) * sx, Cc[1] + (p[:, 1] - Cc[1]) * sy], 1)
fills = sorted(F['fills'], key=lambda f: (order.index(f['layer']), f['idx']))
# current table
FT = {'t': TIMES, 'g': {}}
if os.path.exists(outp):
    s = open(outp).read(); m = re.search(r'export const FT = (\{.*\});', s, re.S)
    if m: FT = json.loads(m.group(1))
G = FT['g']
stats = {}
for k, t in enumerate(TIMES):
    fs = glob.glob(f'{rd}/frame-*-at-{t:g}s.png')
    if not fs: continue
    d = DOLLY[k]
    A = cv2.cvtColor(cv2.imread(fs[0]), cv2.COLOR_BGR2GRAY).astype(float); B = cv2.cvtColor(cv2.imread(fs[0].replace('frame-', 'ref-')), cv2.COLOR_BGR2GRAY).astype(float)
    idx = np.full(A.shape, -1, np.int32)
    for i, f in enumerate(fills):
        pl = planes[f['layer']]
        desk = f['layer'] in ('deskTop', 'deskBase', 'under')
        Cc = np.array([1105, cyat(t)]) if desk else C
        d = DOLLY[k] + (DD.get(k, 0) if desk else 0)
        polys = []
        for sub in f['subs']:
            q = clip(sub, pl, d) if len(pl) <= 3 else sub
            if len(q) < 3: continue
            P = mapp(q, pl, d, Cc)
            if np.abs(P).max() > 20000: continue
            polys.append(np.round(P * 4).astype(np.int32))
        if not polys: continue
        m = np.zeros(A.shape, np.uint8); cv2.fillPoly(m, polys, 1, lineType=cv2.LINE_8, shift=2)
        idx[m > 0] = i
    hx, top, s = BK[round(t, 2)]
    # the owl (a cross: head and body, the wings, the legs), leaving the floor round and below its feet in the fit
    for (ux0, uy0, ux1, uy1) in [(-85, -45, 85, 265), (-215, 20, 215, 180), (-125, 200, 105, 305)]:
        idx[max(0, int(top + uy0 * s)):max(0, int(top + uy1 * s)), max(0, int(hx + ux0 * s)):max(0, int(hx + ux1 * s))] = -1
    # stay off the region edges (the ink contours and the blur straddle them)
    er = cv2.erode((idx >= 0).astype(np.uint8), np.ones((5, 5), np.uint8))
    for i in np.unique(idx[idx >= 0]):
        m = (idx == i) & (er > 0)
        mm = cv2.erode(m.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        if mm.sum() > 150: m = mm
        n = int(m.sum())
        if n < 150: continue
        stats.setdefault(i, {})[k] = (A[m].mean(), B[m].mean(), n)
tot = err = 0
for i, st in stats.items():
    f = fills[i]; lay = G.setdefault(f['layer'], {}); key = str(f['idx'] + 1)
    g = lay.get(key, [1.0] * len(TIMES))
    for k, (ra, sb, n) in st.items():
        tot += n; err += n * abs(ra - sb)
        if ra < 2 and sb < 2: continue
        r = (sb + 1.5) / (ra + 1.5)
        g[k] = float(np.clip(g[k] * np.clip(r, 0.5, 2.0), 0.2, 10.0))
    lay[key] = g
# fill the frames a fill was not measured on from its nearest measured frame, then smooth lightly over time
for i, st in stats.items():
    f = fills[i]; g = G[f['layer']][str(f['idx'] + 1)]
    have = sorted(st.keys())
    for k in range(len(TIMES)):
        if k not in st and have:
            j = min(have, key=lambda h: abs(h - k)); g[k] = g[j]
    sm = [g[0]] + [0.25 * g[k - 1] + 0.5 * g[k] + 0.25 * g[k + 1] for k in range(1, len(g) - 1)] + [g[-1]]
    G[f['layer']][str(f['idx'] + 1)] = [round(v, 3) for v in sm]
print('weighted |ren-src| over fills (before this update):', round(err / max(1, tot), 2), 'n', tot)
for k, t in enumerate(TIMES):
    e = [(n, abs(a - b)) for st in stats.values() for kk, (a, b, n) in st.items() if kk == k]
    if e: print(f'  {t:.2f}: {sum(n*x for n,x in e)/sum(n for n,x in e):5.1f}  ({sum(n for n,x in e)} px)')
hdr = ('// s14 per-fill tone gains per dolly frame (fix pass 1), generated by trace/tone2.py: FT.g[layer][id][k] multiplies the\n'
       '// fill\'s finished value at frame 40.00 + 0.04 k (id = fill index + 1; floor ids = its tone zones). Scalars only.\n')
open(outp, 'w').write(hdr + 'export const FT = ' + json.dumps(FT, separators=(',', ':')) + ';\n')
