#!/usr/bin/env python3
# s26 beat C: rebuild the shard field as straight-edged shards (measurement only; the render draws our own pages).
#  1. the gap (where the colour page shows through the blast hole) = the traced gap cells, cleaned, as DP polygons;
#  2. the measured shard edges (fieldC.json segs) extended to meet each other, + the gap outline + the frame border,
#     rasterised at full res; the cells between them; big cells cut by seeded straight chords (glass-like shards);
#  3. per shard, its content = the piece of OUR B&W page (or, high up, the colour page), or black, whose blurred tones
#     best match the source cell on the 112.00 frame (ungraded, 1/4 res), starting from the traced cell's measured
#     content. No designer faces; no colour pieces in grey cells.
# Output: snapshots/s26-fix1-meas/c/field2.json  {cells: [[type, a, b, c, d, e, f, x0, y0, ...]]}
import cv2, numpy as np, json, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s26c-tools')
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s26-fix1-tools')
from grade import ungrade
from shardnet import extend, cells as netcells
R = '/Users/computer/rootline/apprentice-film/snapshots'
M = f'{R}/s26c-meas'; OUT = f'{R}/s26-fix1-meas/c'
W, H = 2206, 946; Q = 4; F = 2800
d = json.load(open(f'{M}/fieldC.json'))
look = json.load(open(f'{M}/fieldlook.json'))
look = {int(k): v for k, v in look.items()}
look.pop(3, None)                                   # the designer-face piece (review #1)
Mb = np.array(d['Mb'], float).reshape(2, 3); Mc = np.array(d['Mc'], float).reshape(2, 3)

# ---- traced labels (for the gap and for each shard's starting content)
lab = np.zeros((H, W), np.int32) - 1                # index of the traced cell
for k, c in enumerate(d['cells']):
    cv2.fillPoly(lab, [np.array(c['p'], np.int32).reshape(-1, 2)], k)
isgap = np.array([c['lab'] == 1 and c['dx'] == 0 and c['dy'] == 0 and k not in look for k, c in enumerate(d['cells'])])
G = np.zeros((H, W), np.uint8)
G[(lab >= 0) & isgap[np.maximum(lab, 0)]] = 1
out_mask = (cv2.dilate((lab >= 0).astype(np.uint8), np.ones((9, 9), np.uint8)) == 0)
G[out_mask] = 1
owlF = np.fromfile(f'{R}/s26b-meas/fit/m/{F}.bin', np.uint8).reshape(473, 1103)
owlF = cv2.dilate((cv2.resize(owlF, (W, H)) > 100).astype(np.uint8), np.ones((15, 15), np.uint8))
G = cv2.morphologyEx(G, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
G = cv2.morphologyEx(G, cv2.MORPH_OPEN, np.ones((41, 41), np.uint8))
n, cl, st, _ = cv2.connectedComponentsWithStats(G, connectivity=4)
for i in range(1, n):
    if st[i, 4] < 20000: G[cl == i] = 0
cs, _ = cv2.findContours(G, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
gapsegs = []
for c in cs:
    if cv2.contourArea(c) < 1500: continue
    P = cv2.approxPolyDP(c, 7, True).reshape(-1, 2).astype(float)
    for i in range(len(P)): gapsegs.append((*P[i], *P[(i + 1) % len(P)]))

# ---- the net
S = d['segs']; segs = [tuple(S[i:i + 4]) for i in range(0, len(S), 4)]
ext = extend(segs, 90, 1.2)
border = [(0, 0, W, 0), (W, 0, W, H), (W, H, 0, H), (0, H, 0, 0)]
allsegs = ext + border

def classify(res, labimg, pad):
    gap, shard = [], []
    for P, a, i in res:
        m = labimg[pad:pad + H, pad:pad + W] == i
        fr = G[m].mean() if m.any() else 1
        (gap if fr > 0.5 else shard).append((P, a, i, fr))
    return gap, shard

rng = np.random.default_rng(112)
for it in range(14):
    res, labimg, pad = netcells(allsegs, W, H)
    gap, shard = classify(res, labimg, pad)
    big = [(P, a, i) for P, a, i, fr in shard + gap if a > 16000 and fr < 0.85]
    print('iter', it, 'cells', len(res), 'gap', len(gap), 'shard', len(shard), 'big', len(big))
    if not big: break
    for P, a, i in big:
        m = labimg[pad:pad + H, pad:pad + W] == i
        ys, xs = np.nonzero(m)
        ncut = int(min(4, a // 16000))
        for c in range(ncut):
            j = rng.integers(len(xs)); p = np.array([xs[j], ys[j]], float)
            th = rng.uniform(0, np.pi); dv = np.array([np.cos(th), np.sin(th)])
            ends = []
            for sgn in (1, -1):
                t = 0
                while True:
                    q = p + sgn * dv * (t + 1)
                    xi, yi = int(round(q[0])), int(round(q[1]))
                    if not (0 <= xi < W and 0 <= yi < H) or not m[yi, xi]: break
                    t += 1
                ends.append(p + sgn * dv * (t + 2))
            allsegs.append((*ends[0], *ends[1]))
res, labimg, pad = netcells(allsegs, W, H)
gap, shard = classify(res, labimg, pad)
print('final', len(shard), 'shards', len(gap), 'gap cells')
shard = [(P, a, i) for P, a, i, fr in shard]

# ---- content
src = ungrade(cv2.imread(f'{M}/src/{F}.png'), F / 25)
def labf(im): return cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32), (0, 0), 1.5), cv2.COLOR_BGR2LAB)
small = lambda im: cv2.resize(im, (W // Q, H // Q), interpolation=cv2.INTER_AREA)
Ssm = small(src); SL = labf(Ssm)
bw = small(cv2.imread(f'{R}/s26-fix1-meas/pages/r2500.png').astype(np.float32) / 255)
col = small(cv2.imread(f'{R}/s26-fix1-meas/pages/r2550.png').astype(np.float32) / 255)
chroma = lambda im: (im.max(2) - im.min(2)) > 0.2
bwF = np.zeros(bw.shape[:2], np.float32); bwF[310 // Q:462 // Q, 968 // Q:1134 // Q] = 1          # the designer's face (sōko)
colF = np.zeros(col.shape[:2], np.float32); colF[286 // Q:640 // Q, 900 // Q:1256 // Q] = 1       # the designer (colour page)
owl = np.fromfile(f'{R}/s26b-meas/fit/m/{F}.bin', np.uint8).reshape(473, 1103)
owl = cv2.resize(owl, (W // Q, H // Q)) > 100
BLACK = labf(np.full((1, 1, 3), 0.012, np.float32))[0, 0]
def warp(img, A, box, border=0):
    x0, y0, x1, y1 = box; Aq = A.copy(); Aq[:, 2] = Aq[:, 2] / Q - np.array([x0, y0])
    return cv2.warpAffine(img, Aq, (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR, borderValue=border)
def simA(s, th, q, cen):
    ct, sn = np.cos(th), np.sin(th); a, b, dd, e = s * ct, -s * sn, s * sn, s * ct
    return np.array([[a, b, cen[0] - (a * q[0] + b * q[1])], [dd, e, cen[1] - (dd * q[0] + e * q[1])]])
cells_out = []; tot = 0; area = 0; stats = {0: 0, 1: 0, 2: 0}
for P, a, i in shard:
    m = np.zeros((H // Q, W // Q), np.uint8); cv2.fillPoly(m, [(P / Q).round().astype(np.int32)], 1)
    mo = m.copy(); mo[owl] = 0
    use = mo if mo.sum() >= 6 else m
    ys, xs = np.nonzero(use)
    if len(xs) < 3:
        cells_out.append([2, 0, 0, 0, 0, 0, 0] + [round(float(v), 1) for v in P.reshape(-1)]); continue
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1); mm = use[box[1]:box[3], box[0]:box[2]] > 0
    Sc = SL[box[1]:box[3], box[0]:box[2]][mm]
    srcSat = chroma(Ssm[box[1]:box[3], box[0]:box[2]])[mm].mean()
    cen = P.mean(0); low = cen[1] > 473
    def cost(which, A):
        img = bw if which == 0 else col
        wv = warp(img, A, box)
        fz = warp(bwF if which == 0 else colF, A, box)[mm].mean()
        if fz > 0.03: return 1e9
        sat = chroma(wv)[mm].mean()
        if sat > srcSat + 0.1: return 1e9
        return float(np.sqrt(((labf(wv)[mm] - Sc) ** 2).sum(1)).mean())
    # starting content: the traced cell under most of this shard
    fm = labimg[pad:pad + H, pad:pad + W] == i
    ks = lab[fm]; ks = ks[ks >= 0]
    best = (float(np.sqrt(((BLACK - Sc) ** 2).sum(1)).mean()), (2, None))
    if len(ks):
        k = int(np.bincount(ks).argmax()); c = d['cells'][k]
        if k in look:
            o = look[k]; A = np.array(o[1:7]).reshape(2, 3); which = 0 if o[0] == 3 else 1
            if not (which == 1 and low): v = cost(which, A); best = min(best, (v, (which, A)), key=lambda z: z[0])
        if c['lab'] in (0, 1) and not (c['lab'] == 1 and low):
            A = (Mb if c['lab'] == 0 else Mc).copy(); A[:, 2] += [c['dx'], c['dy']]
            v = cost(c['lab'], A); best = min(best, (v, (c['lab'], A)), key=lambda z: z[0])
    cand = [(0, 1.128, 0.08, 0)] + ([] if low else [(1, 0.84, 0.08, 0)]) + ([(0, 1.128, 0.1, 1)] if srcSat > 0.06 else [])
    for which, s0, sd, strip in cand:
        for _ in range(160):
            s = s0 * np.exp(rng.normal(0, sd)); th = rng.normal(0, 0.12)
            if strip: q = np.array([rng.uniform(190, 1970), rng.uniform(195, 355)])      # the colour strip in the header
            else: q = np.array([rng.uniform(150, 2030), rng.uniform(130, 905)]) if which == 0 else np.array([rng.uniform(0, W), rng.uniform(0, H)])
            A = simA(s, th, q, cen); v = cost(which, A)
            if v < best[0]: best = (v, (which, A, s, th, q))
    if best[1][0] != 2 and len(best[1]) == 5:
        which, A, s, th, q = best[1]
        for _ in range(100):
            s2 = s * np.exp(rng.normal(0, 0.03)); th2 = th + rng.normal(0, 0.04); q2 = q + rng.normal(0, 10, 2)
            A2 = simA(s2, th2, q2, cen); v = cost(which, A2)
            if v < best[0]: best = (v, (which, A2, s2, th2, q2)); s, th, q = s2, th2, q2
    which = best[1][0]; stats[which] += 1
    Am = [0] * 6 if which == 2 else [round(float(x), 5) for x in best[1][1].reshape(-1)]
    cells_out.append([which] + Am + [round(float(v), 1) for v in P.reshape(-1)])
    aa = float(mm.sum()); tot += best[0] * aa; area += aa
print('content', stats, 'area-weighted dE %.2f' % (tot / area))
json.dump({'cells': cells_out}, open(f'{OUT}/field2.json', 'w'))
# the radial streaks: measured segments lying in the gap (the blast's white speed streaks over the colour page)
streaks = []
for (x0, y0, x1, y1) in segs:
    n = 12; inG = np.mean([G[min(H - 1, max(0, int(y0 + (y1 - y0) * k / n))), min(W - 1, max(0, int(x0 + (x1 - x0) * k / n)))] for k in range(n + 1)])
    if inG > 0.7: streaks.append([round(float(v), 1) for v in (x0, y0, x1, y1)])
json.dump(streaks, open(f'{OUT}/streaks.json', 'w')); print('streaks', len(streaks))
cv2.imwrite(f'{OUT}/gapG.png', G * 255)
# preview: shard outlines over the source
im = (cv2.imread(f'{M}/src/{F}.png') * 0.7).astype(np.uint8)
for c in cells_out:
    P = np.array(c[7:]).reshape(-1, 2)
    cv2.polylines(im, [P.round().astype(np.int32)], True, (0, 255, 255) if c[0] == 0 else (255, 0, 255) if c[0] == 1 else (0, 0, 255), 2)
cv2.imwrite(f'{OUT}/field2_net.jpg', cv2.resize(im, None, fx=0.8, fy=0.8))
