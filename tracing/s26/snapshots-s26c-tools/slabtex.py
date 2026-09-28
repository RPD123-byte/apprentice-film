#!/usr/bin/env python3
# Beat E: per frame, the lens shard = the measured polygon (convex hull of the shard mask, slab2.json) filled with a
# piece of OUR B&W page (bwPlain, desaturated) under a similarity, heavily blurred, with a grey level gain/offset.
# The similarity, blur, gain and offset are chosen per frame by a seeded search minimising the blurred Lab error
# against the source inside the polygon (1/4 res), each frame starting from its neighbour's solution.
import cv2, numpy as np, json, sys
sys.path.insert(0, '.')
from grade import ungrade
M = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas'
W, H = 2206, 946; Q = 4
polys = json.load(open(f'{M}/slab2.json'))
page = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s26c-out/pages/r2500.png').astype(np.float32) / 255
pg = cv2.cvtColor(page, cv2.COLOR_BGR2GRAY)
pgQ = cv2.resize(pg, (W // Q, H // Q), interpolation=cv2.INTER_AREA)
rng = np.random.default_rng(2848)
def srcL(F):
    s = ungrade(cv2.imread(f'{M}/src/{F}.png'), F / 25)
    sQ = cv2.resize(s, (W // Q, H // Q), interpolation=cv2.INTER_AREA)
    return cv2.cvtColor(cv2.GaussianBlur(sQ, (0, 0), 2), cv2.COLOR_BGR2LAB)
def render(par, F):
    s, th, tx, ty, blur, a, b = par
    ct, sn = np.cos(th), np.sin(th)
    A = np.array([[s * ct, -s * sn, tx / Q], [s * sn, s * ct, ty / Q]], np.float32)
    w = cv2.warpAffine(pgQ, A, (W // Q, H // Q), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    w = cv2.GaussianBlur(w, (0, 0), max(0.5, blur / Q))
    return np.clip(a * w + b, 0, 1)
def cost(par, S, mk):
    g = render(par, 0)
    L = g * 100.0   # grey: L only (a*, b* ~ 0 on the shard)
    d = np.sqrt((L - S[..., 0] * 100 / 100) ** 2 + S[..., 1] ** 2 + S[..., 2] ** 2)
    return float(d[mk].mean())
res = {}
order = [2848, 2849, 2850, 2851, 2852, 2853, 2847, 2846, 2845, 2844, 2843, 2842]
prev = {}
for F in order:
    if str(F) not in polys: continue
    S = srcL(F); S = S.astype(np.float32)
    mk = np.zeros((H // Q, W // Q), np.uint8); cv2.fillPoly(mk, [(np.array(polys[str(F)]['poly'], np.float32) / Q).astype(np.int32)], 1)
    mk = cv2.erode(mk, np.ones((5, 5), np.uint8)) > 0
    if mk.sum() < 50: continue
    nb = prev.get(F - 1) or prev.get(F + 1)
    if nb is None:
        best = (1e9, None)
        for i in range(1500):
            par = [rng.uniform(3, 7), np.radians(rng.uniform(-45, 15)), rng.uniform(-9000, 3000), rng.uniform(-6000, 3000), rng.uniform(8, 30), rng.uniform(0.4, 1.0), rng.uniform(0.0, 0.25)]
            v = cost(par, S, mk)
            if v < best[0]: best = (v, par)
        par = best[1]
    else:
        par = list(nb); best = (cost(par, S, mk), par)
        for i in range(400):
            q = list(par); q[0] *= np.exp(rng.normal(0, 0.08)); q[1] += rng.normal(0, 0.08); q[2] += rng.normal(0, 250); q[3] += rng.normal(0, 250)
            v = cost(q, S, mk)
            if v < best[0]: best = (v, q); par = q
    sc = np.array([0.08, 0.05, 60, 60, 2, 0.05, 0.02])
    for it in range(1600):
        q = list(par); k = it % 7; q[k] += rng.normal(0, sc[k])
        if it % 400 == 399: sc *= 0.6
        q[4] = max(4, q[4])
        v = cost(q, S, mk)
        if v < best[0]: best = (v, q); par = q
    prev[F] = par; res[F] = [float(x) for x in par] + [best[0]]
    print(F, 'dE %.2f' % best[0], 's %.2f th %.1f t (%.0f, %.0f) blur %.1f a %.2f b %.2f' % (par[0], np.degrees(par[1]), par[2], par[3], par[4], par[5], par[6]))
json.dump(res, open(f'{M}/slabtex.json', 'w'))
