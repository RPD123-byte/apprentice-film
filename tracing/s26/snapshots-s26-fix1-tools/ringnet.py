#!/usr/bin/env python3
# s26 beat D: rebuild the ring of B&W shards round the colour window at 112.72 as straight-edged shards (measurement
# only; the render draws our own pages):
#  1. the colour window = where the source matches OUR colour page under pageArrival(112.72) (+ the owl), cleaned and
#     simplified to a straight-edged polygon (window2.json);
#  2. the measured ring edges (RING_SEGS) extended to meet each other + the window outline + the frame border,
#     rasterised; the cells outside the window; big cells cut by seeded straight chords;
#  3. per shard: the piece of OUR B&W page (enlarged, as the ring's shards are) or black whose blurred tones best match
#     the source shard on 112.72 (ungraded, 1/4 res), starting from the traced cell's measured page transform.
# Output: s26-fix1-meas/c/ring2.json {cells: [[type, a..f, x0, y0, ...]], window: [...]}
import cv2, numpy as np, json, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s26c-tools')
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s26-fix1-tools')
from grade import ungrade
from shardnet import extend, cells as netcells
R = '/Users/computer/rootline/apprentice-film/snapshots'
M = f'{R}/s26c-meas'; OUT = f'{R}/s26-fix1-meas/c'
W, H = 2206, 946; Q = 4; F = 2818
win = np.array(json.load(open(f'{OUT}/window2.json')), float).reshape(-1, 2)
G = np.zeros((H, W), np.uint8); cv2.fillPoly(G, [win.round().astype(np.int32)], 1)
rc = json.load(open(f'{OUT}/ringcells.json'))
lab = np.zeros((H, W), np.int32) - 1
for k, r in enumerate(rc): cv2.fillPoly(lab, [np.array(r[7:]).reshape(-1, 2).round().astype(np.int32)], k)
S = json.load(open(f'{OUT}/ringsegs.json')); segs = [tuple(S[i:i + 4]) for i in range(0, len(S), 4)]
# drop measured edges lying inside the window (they belong to shards that are not there any more in our window)
def inG(s):
    x0, y0, x1, y1 = s; n = 10
    return np.mean([G[min(H - 1, max(0, int(y0 + (y1 - y0) * k / n))), min(W - 1, max(0, int(x0 + (x1 - x0) * k / n)))] for k in range(n + 1)])
segs = [s for s in segs if inG(s) < 0.6]
ext = extend(segs, 110, 1.5)
winsegs = [(*win[i], *win[(i + 1) % len(win)]) for i in range(len(win))]
border = [(0, 0, W, 0), (W, 0, W, H), (W, H, 0, H), (0, H, 0, 0)]
allsegs = ext + winsegs + border
def classify(res, labimg, pad):
    gap, shard = [], []
    for P, a, i in res:
        m = labimg[pad:pad + H, pad:pad + W] == i
        fr = G[m].mean() if m.any() else 1
        (gap if fr > 0.5 else shard).append((P, a, i, fr))
    return gap, shard
rng = np.random.default_rng(2818)
for it in range(14):
    res, labimg, pad = netcells(allsegs, W, H)
    gap, shard = classify(res, labimg, pad)
    big = [(P, a, i) for P, a, i, fr in shard if a > 22000]
    print('iter', it, 'cells', len(res), 'gap', len(gap), 'shard', len(shard), 'big', len(big))
    if not big: break
    for P, a, i in big:
        m = labimg[pad:pad + H, pad:pad + W] == i
        ys, xs = np.nonzero(m)
        for c in range(int(min(4, a // 22000))):
            j = rng.integers(len(xs)); p = np.array([xs[j], ys[j]], float)
            th = rng.uniform(0, np.pi); dv = np.array([np.cos(th), np.sin(th)])
            ends = []
            for sgn in (1, -1):
                t = 0
                while True:
                    q = p + sgn * dv * (t + 1); xi, yi = int(round(q[0])), int(round(q[1]))
                    if not (0 <= xi < W and 0 <= yi < H) or not m[yi, xi]: break
                    t += 1
                ends.append(p + sgn * dv * (t + 2))
            allsegs.append((*ends[0], *ends[1]))
res, labimg, pad = netcells(allsegs, W, H)
gap, shard = classify(res, labimg, pad)
shard = [(P, a, i) for P, a, i, fr in shard]
print('final', len(shard), 'shards')

src = ungrade(cv2.imread(f'{M}/src/{F}.png'), F / 25)
def labf(im): return cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32), (0, 0), 1.5), cv2.COLOR_BGR2LAB)
small = lambda im: cv2.resize(im, (W // Q, H // Q), interpolation=cv2.INTER_AREA)
Ssm = small(src); SL = labf(Ssm)
bw = small(cv2.imread(f'{R}/s26-fix1-meas/pages/r2500.png').astype(np.float32) / 255)
col = small(cv2.imread(f'{R}/s26-fix1-meas/pages/r2550.png').astype(np.float32) / 255)
arr = small(cv2.imread(f'{R}/s26-fix1-meas/pages/r2818.png').astype(np.float32) / 255)   # our colour page as it arrives at 112.72
ARL = labf(arr)
colF = np.zeros(col.shape[:2], np.float32); colF[286 // Q:640 // Q, 900 // Q:1256 // Q] = 1
chroma = lambda im: (im.max(2) - im.min(2)) > 0.2
bwF = np.zeros(bw.shape[:2], np.float32); bwF[310 // Q:462 // Q, 968 // Q:1134 // Q] = 1
owl = np.fromfile(f'{R}/s26b-meas/fit/m/{F}.bin', np.uint8).reshape(473, 1103)
owl = cv2.resize(owl, (W // Q, H // Q)) > 100
BLACK = labf(np.full((1, 1, 3), 0.012, np.float32))[0, 0]
def warp(img, A, box):
    x0, y0, x1, y1 = box; Aq = A.copy(); Aq[:, 2] = Aq[:, 2] / Q - np.array([x0, y0])
    return cv2.warpAffine(img, Aq, (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR)
def simA(s, th, q, cen):
    ct, sn = np.cos(th), np.sin(th); a, b, dd, e = s * ct, -s * sn, s * sn, s * ct
    return np.array([[a, b, cen[0] - (a * q[0] + b * q[1])], [dd, e, cen[1] - (dd * q[0] + e * q[1])]])
out = []; tot = area = 0; stats = {0: 0, 2: 0}
for P, a, i in shard:
    m = np.zeros((H // Q, W // Q), np.uint8); cv2.fillPoly(m, [(P / Q).round().astype(np.int32)], 1)
    mo = m.copy(); mo[owl] = 0; use = mo if mo.sum() >= 6 else m
    ys, xs = np.nonzero(use)
    if len(xs) < 3: out.append([2, 0, 0, 0, 0, 0, 0] + [round(float(v), 1) for v in P.reshape(-1)]); stats[2] += 1; continue
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1); mm = use[box[1]:box[3], box[0]:box[2]] > 0
    Sc = SL[box[1]:box[3], box[0]:box[2]][mm]
    srcSat = chroma(Ssm[box[1]:box[3], box[0]:box[2]])[mm].mean()
    cen = P.mean(0)
    def cost(A, which=0):
        wv = warp(bw if which == 0 else col, A, box)
        if warp(bwF if which == 0 else colF, A, box)[mm].mean() > 0.03: return 1e9
        if chroma(wv)[mm].mean() > srcSat + 0.1: return 1e9
        return float(np.sqrt(((labf(wv)[mm] - Sc) ** 2).sum(1)).mean())
    best = (float(np.sqrt(((BLACK - Sc) ** 2).sum(1)).mean()), None)
    fm = labimg[pad:pad + H, pad:pad + W] == i
    ks = lab[fm]; ks = ks[ks >= 0]
    if len(ks) and (ks.size / fm.sum()) > 0.3:
        r = rc[int(np.bincount(ks).argmax())]
        if r[0] == 0:
            A = np.array([[r[1], r[2], r[3]], [r[4], r[5], r[6]]], float); v = cost(A)
            if v < best[0]: s0 = np.hypot(r[1], r[4]); best = (v, (A, s0, np.arctan2(r[4], r[1]), None))
    for _ in range(200):
        s = np.exp(rng.normal(np.log(2.0), 0.2)); th = rng.normal(0, 0.35)
        q = np.array([rng.uniform(150, 2030), rng.uniform(130, 905)])
        A = simA(s, th, q, cen); v = cost(A)
        if v < best[0]: best = (v, (A, s, th, q))
    which = 0
    # clear glass: the arriving colour page seen through the shard (outline only)
    vcl = float(np.sqrt(((ARL[box[1]:box[3], box[0]:box[2]][mm] - Sc) ** 2).sum(1)).mean())
    if vcl < best[0]: best = (vcl, 'clear')
    if srcSat > 0.06 or cen[1] < 420:   # colourful shards: pieces of the colour strip in the page's header, or of the colour page
        for wh in (0, 1):
            for _ in range(200):
                s = np.exp(rng.normal(np.log(2.0 if wh == 0 else 1.6), 0.25)); th = rng.normal(0, 0.35)
                q = np.array([rng.uniform(190, 1970), rng.uniform(195, 355)]) if wh == 0 else np.array([rng.uniform(0, W), rng.uniform(0, H)])
                A = simA(s, th, q, cen); v = cost(A, wh)
                if v < best[0]: best = (v, (A, s, th, q)); which = wh
    if best[1] == 'clear':
        out.append([3, 0, 0, 0, 0, 0, 0] + [round(float(v), 1) for v in P.reshape(-1)]); stats[3] = stats.get(3, 0) + 1
        aa = float(mm.sum()); tot += best[0] * aa; area += aa; continue
    if best[1] is not None and best[1][3] is not None:
        A, s, th, q = best[1]
        for _ in range(100):
            s2 = s * np.exp(rng.normal(0, 0.03)); th2 = th + rng.normal(0, 0.04); q2 = q + rng.normal(0, 8, 2)
            A2 = simA(s2, th2, q2, cen); v = cost(A2, which)
            if v < best[0]: best = (v, (A2, s2, th2, q2)); s, th, q = s2, th2, q2
    if best[1] is None: out.append([2, 0, 0, 0, 0, 0, 0] + [round(float(v), 1) for v in P.reshape(-1)]); stats[2] += 1
    else: stats[which] = stats.get(which, 0) + 1; out.append([which] + [round(float(x), 5) for x in best[1][0].reshape(-1)] + [round(float(v), 1) for v in P.reshape(-1)]); 
    aa = float(mm.sum()); tot += best[0] * aa; area += aa
print('content', stats, 'area-weighted dE %.2f' % (tot / area))
json.dump({'cells': out, 'window': win.reshape(-1).tolist()}, open(f'{OUT}/ring2.json', 'w'))
im = (cv2.imread(f'{M}/src/{F}.png') * 0.7).astype(np.uint8)
for c in out:
    cv2.polylines(im, [np.array(c[7:]).reshape(-1, 2).round().astype(np.int32)], True, (0, 255, 255) if c[0] == 0 else (0, 0, 255), 2)
cv2.imwrite(f'{OUT}/ring2_net.jpg', cv2.resize(im, None, fx=0.8, fy=0.8))
