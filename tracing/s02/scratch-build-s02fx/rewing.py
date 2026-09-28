# Re-measure the s02 wings (fix pass): right wing 436/437 re-segmented (they had merged with a lit carton), interiors
# recomputed for every frame with the part of each outline that was grown under the body treated as the wing's pale
# root (no dark shards), small dark specks dropped.
import sys, json, os, numpy as np, cv2
T = '/Users/computer/rootline/apprentice-film/src/shots/s02/trace'; sys.path.insert(0, T)
import wing_local as wl, levels as lv
X = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s02fx/'
U0, U1, V0, V1 = wl.U0, wl.U1, wl.V0, wl.V1
res = json.load(open(X + 'wings17.json')); byf = {r['f']: r for r in res}
FLYR = (cv2.imread(X + 'flyreg.png', 0) > 0).astype(np.uint8)
FLY = cv2.dilate(FLYR, np.ones((5, 5), np.uint8))
def fill_holes(m):
    ff = m.copy(); h, w = m.shape; mask = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(ff, mask, (0, 0), 1); return m | (1 - ff)
def rast(q):
    m = np.zeros((V1 - V0, U1 - U0), np.uint8); cv2.fillPoly(m, [np.round(np.array(q) - [U0, V0]).astype(np.int32)], 1); return m
LOC = {}
def loc(f):
    if f not in LOC: LOC[f] = wl.local(f)[0]
    return LOC[f]
# ---- right wing 436 / 437: brighter threshold (the wing ~0.85-0.95, the lit carton 0.6-0.8), nothing above v -345
for f in (436, 437):
    Lp = loc(f); b = cv2.GaussianBlur(Lp, (0, 0), 1.2)
    m = (b > 0.8).astype(np.uint8); m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    yy, xx = np.mgrid[0:m.shape[0], 0:m.shape[1]]; uu = xx + U0; vv = yy + V0
    m[(uu < 90) | (vv < -345) | (np.hypot(uu - 104, vv + 44) > 470)] = 0
    m[FLYR > 0] = 0
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    k = 1 + int(np.argmax(st[1:, 4])); wm = fill_holes((lab == k).astype(np.uint8))
    wm = cv2.morphologyEx(wm, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    wm = wm | (cv2.dilate(wm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (51, 51))) & FLY)
    cs, _ = cv2.findContours(wm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); c = max(cs, key=cv2.contourArea)
    q = cv2.approxPolyDP(c, 1.5, True)[:, 0, :].astype(float)
    byf[f]['R'] = [[round(x + U0, 1), round(y + V0, 1)] for x, y in q]; byf[f].pop('Rmorph', None); byf[f]['Rarea'] = int(wm.sum())
    print('R', f, 'area', int(wm.sum()), 'pts', len(q), flush=True)
# ---- take-off 397-400: drop notches under ~10 units (closing), smooth the outline
for f in (397, 398, 399, 400):
    for side in ('L', 'R'):
        m = rast(byf[f][side]); m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
        m = (cv2.GaussianBlur(m.astype(np.float32), (0, 0), 2.0) > 0.5).astype(np.uint8)
        cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); c = max(cs, key=cv2.contourArea)
        q = cv2.approxPolyDP(c, 1.2, True)[:, 0, :].astype(float)
        byf[f][side] = [[round(x + U0, 1), round(y + V0, 1)] for x, y in q]
json.dump(res, open(X + 'wings18.json', 'w'))
# ---- interiors
WLEV = [0.6, 0.72, 0.82, 0.9]
def interior(f, side, qsil):
    m = rast(qsil); P = cv2.GaussianBlur(loc(f), (0, 0), 0.8)
    grown = m & FLY                                    # tucked under the body: the pale root, never dark
    ms = [m] + [(((P > t) | (grown > 0)) & (m > 0)).astype(np.uint8) for t in WLEV[:1]] + [((P > t) & (m > 0)).astype(np.uint8) for t in WLEV[1:]]
    ms = [ms[0]] + [cv2.morphologyEx(x, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)) for x in ms[1:]]
    # dark specks: holes of the first bright level smaller than ~12 units are filled (no shards)
    inv = (ms[0] > 0) & (ms[1] == 0); n, lab, st, _ = cv2.connectedComponentsWithStats(inv.astype(np.uint8))
    for i in range(1, n):
        if st[i, 4] < 12: ms[1][lab == i] = 1
    return lv.stack(P, ms, off=(U0, V0), eps=1.5, minarea=10, tile=100000)
INK = {}
for r in res:
    f = r['f']; INK[f] = {}
    for side in ('L', 'R'):
        mirror = bool(r.get(side + 'mirror'))
        if mirror:
            qR = byf[f]['R']; Lv = interior(f, 'R', qR)
            Lv = [[{**s, 'r': [[[-x, y] for x, y in qq] for qq in s['r']]} for s in lev] for lev in Lv]
        else:
            src_f = r[side + 'morph'][0] if r.get(side + 'morph') else f
            Lv = interior(src_f, side, byf[f][side] if src_f == f else byf[src_f][side])
        INK[f][side] = Lv
    print('ink', f, flush=True)
json.dump({str(k): v for k, v in INK.items()}, open(X + 'wings18-ink.json', 'w'))
