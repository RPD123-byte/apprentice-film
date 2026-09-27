#!/usr/bin/env python3
# Fix pass 1: the hole's torn rim, re-measured (replaces measure_rim.py's per-column argmax, which jumped onto bright
# things next to the rim: the designer's eyes, a leaf, the owl's feet, the card's edge). Measuring only — writes the
# rim's centre-line as coordinates (../rim.js), no pixels.
#   measure_rim2.py FRAMES_DIR OUT_JSON   (FRAMES_DIR/fNNNN.png = source frames 2066–2100, 82.64–84.00)
# 1. Median of the 35 frames with the card (its quad per source pose, dilated 9 px) and the walking owl (its traced
#    silhouette placed per pose, dilated 6 px) masked out.
# 2. Line response R = −∂²/∂n² of the σ2 median across each side (a bright line, not the edge of a bright area).
# 3. Per side a dynamic-programming track of the ridge (0.25 px steps, a quadratic penalty on the step between
#    columns) — continuity keeps it off neighbouring bright shapes; masked columns cost nothing and are interpolated.
# 4. Sub-pixel: the half-maximum centroid of the line within ±4 px of the track, a σ1.5 px smoothing along the side, corners where the sides' end samples meet,
#    RDP 0.3 px. Output in pixel-index coordinates.
import sys, re, os, json, subprocess, cv2, numpy as np
FR, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
txt = open(os.path.join(HERE, '..', '..', 's22.js')).read()
CARD = eval(re.search(r'const CARD = (\[.*?\]);', txt, re.S).group(1).replace('\n', ''))
FIX = eval(re.search(r'const CARD_FIX = (\[.*?\]);', txt).group(1))
def card_at(F):
    r = CARD[0]
    for k in CARD:
        if k[0] <= F / 25 + 0.005: r = k
    v = [a + (FIX[i] if F / 25 >= 81.52 else 0) for i, a in enumerate(r[1:])]
    return np.array([[v[0], v[1]], [v[2], v[3]], [v[4], v[5]], [v[6], v[7]]], np.float32)
# the walk's silhouette (s22/owlData.js) and its per-pose transform
js = "import('%s').then(m=>{const T=m.TRACED;console.log(JSON.stringify({walk:T.walk,haul:T.f8396}))})" % os.path.join(HERE, '..', 'owlData.js')
D = json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True).stdout)
def dec(s):
    p = s.split(','); x = y = 0; out = []
    for i in range(0, len(p), 2):
        x += int(p[i], 36); y += int(p[i + 1], 36); out.append((x / 10, y / 10))
    return np.array(out, np.float32)
WT = sorted((float(t), m) for t, m in D['walk']['meta']['warp'].items())
def owl_mask(F, shape):
    m = np.zeros(shape, np.uint8); t = F / 25
    if t >= 83.96:
        T = D['haul']; M = [1, 0, 0, 1, 0, 0]
    else:
        T = D['walk']; M = [m_ for tt, m_ in WT if tt <= t + 1e-6][-1]
    a, b, c, d, e, f = M; o = T['o']
    for r in T['sil']:
        P = dec(r) + np.array(o, np.float32)
        Q = np.stack([a * P[:, 0] + c * P[:, 1] + e, b * P[:, 0] + d * P[:, 1] + f], 1)
        cv2.fillPoly(m, [np.round(Q).astype(np.int32)], 1)
    return cv2.dilate(m, np.ones((13, 13), np.uint8)) > 0
st = []
for F in range(2066, 2101):
    g = cv2.cvtColor(cv2.imread(f'{FR}/f{F:04d}.png'), cv2.COLOR_BGR2GRAY).astype(np.float32)
    m = np.zeros(g.shape, np.uint8); cv2.fillPoly(m, [np.round(card_at(F)).astype(np.int32)], 1)
    m = (cv2.dilate(m, np.ones((19, 19), np.uint8)) > 0) | owl_mask(F, g.shape)
    st.append(np.where(m, np.nan, g))
med = np.nanmedian(np.stack(st), 0)
valid = ~np.isnan(med)
np.save(OUT.replace('.json', '_med.npy'), med)
fill = cv2.GaussianBlur(np.nan_to_num(med, nan=0), (0, 0), 2.0)
raw = np.nan_to_num(med, nan=0)
def response(axis):
    # −second derivative across the line (axis 0: along y for the top/bottom runs; 1: along x for the sides)
    k = np.array([-1, 2, -1], np.float32)
    return cv2.filter2D(fill, -1, k.reshape(-1, 1) if axis == 0 else k.reshape(1, -1))
def track(R, V, I, pos, lo, hi, lam=6.0, step=0.25):
    # R, V: 2D arrays indexed [across, along]; returns sub-pixel across-position per along-index in pos
    ys = np.arange(lo, hi + 1e-6, step)
    def samp(a, q, y):
        y0 = np.floor(y).astype(int); u = y - y0
        return a[y0, q] * (1 - u) + a[y0 + 1, q] * u
    n = len(pos); cost = np.zeros((n, len(ys))); back = np.zeros((n, len(ys)), int)
    dy = ys[None, :] - ys[:, None]; pen = lam * dy * dy
    for i, q in enumerate(pos):
        ok = V[np.round(ys).astype(int), q].astype(float)
        r = samp(R, q, ys) * ok
        c = -r
        if i == 0: cost[i] = c; continue
        tot = cost[i - 1][:, None] + pen
        back[i] = np.argmin(tot, 0); cost[i] = tot[back[i], np.arange(len(ys))] + c
    j = int(np.argmin(cost[-1])); path = [j]
    for i in range(n - 1, 0, -1): j = back[i, j]; path.append(j)
    path = path[::-1]
    out = []
    for i, q in enumerate(pos):
        y = ys[path[i]]; yi = int(round(y))
        if not V[yi, q]: out.append(np.nan); continue
        # sub-pixel: half-maximum centroid of the line's intensity within ±4 px of the track
        a0 = max(0, yi - 4); p = I[a0:yi + 5, q].astype(float); k = int(np.argmax(p)); pk = p[k]
        j0 = j1 = k
        while j0 > 0 and p[j0 - 1] > 0.5 * pk: j0 -= 1
        while j1 < len(p) - 1 and p[j1 + 1] > 0.5 * pk: j1 += 1
        w = p[j0:j1 + 1] - 0.5 * pk
        out.append(a0 + (np.arange(j0, j1 + 1) * w).sum() / max(1e-6, w.sum()))
    out = np.array(out)
    ok = ~np.isnan(out); out = np.interp(np.arange(n), np.flatnonzero(ok), out[ok])
    return out
def smooth(v, s=1.5):
    r = int(np.ceil(3 * s)); k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2); k /= k.sum()
    p = np.pad(v, r, mode='edge'); return np.convolve(p, k, mode='valid')
Ry = response(0); Rx = response(1)
xs = np.arange(200, 1968); ys_ = np.arange(194, 354)
top = smooth(track(Ry, valid, raw, xs, 178, 198))
bot = smooth(track(Ry, valid, raw, xs, 352, 370))
left = smooth(track(Rx.T, valid.T, raw.T, ys_, 184, 200))
right = smooth(track(Rx.T, valid.T, raw.T, ys_, 1964, 1982))
# corners: where the sides meet (each side's end sample gives the other coordinate)
TL = (left[0], top[0]); TR = (right[0], top[-1]); BR = (right[-1], bot[-1]); BL = (left[-1], bot[0])
def rdp(P, eps):
    P = np.asarray(P, float)
    if len(P) < 3: return [tuple(p) for p in P]
    A, B = P[0], P[-1]; ab = B - A; L = np.linalg.norm(ab) + 1e-9
    dd = np.abs(ab[0] * (P[1:-1, 1] - A[1]) - ab[1] * (P[1:-1, 0] - A[0])) / L; i = int(np.argmax(dd)) + 1
    return rdp(P[:i + 1], eps)[:-1] + rdp(P[i:], eps) if dd[i - 1] > eps else [tuple(A), tuple(B)]
E = 0.3
ring = [TL] + rdp(np.c_[xs, top], E)[:] + [TR] + rdp(np.c_[right, ys_], E) + [BR] + rdp(np.c_[xs, bot][::-1], E) + [BL] + rdp(np.c_[left, ys_][::-1], E)
json.dump({'ring': [[round(float(x), 2), round(float(y), 2)] for x, y in ring], 'corners': [TL, TR, BR, BL],
           'top': top.tolist(), 'bot': bot.tolist(), 'left': left.tolist(), 'right': right.tolist()}, open(OUT, 'w'))
print(len(ring), 'points; corners', [tuple(round(float(c), 1) for c in p) for p in (TL, TR, BR, BL)])
