# Data surgery on the traced s27 key views (measurement-derived vector data; no pixels stored).
#   keysurg.py remove KEY.js ZONE_JSON [--frac 0.6] [--line x0,y0,x1,y1,w,#col]... [--move DKEY.js]
# ZONE_JSON: [[x,y],...] polygon in frame px of the key's frame. Regions/ink polygons with >= frac of their area inside
# the zone are removed from the room key; the vacated area is refilled with flat colour regions inpainted from the
# surrounding traced colours (3-5 posterized bands). With --move, the removed regions/ink go into that designer key
# (same frame coordinates) and its outline is grown to cover them.
import re, sys, json, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/tools/trace-scripts/s27t-tools')
from codec import enc, dec
W2, H2 = 2206, 946
def load(path):
    s = open(path).read()
    names = re.findall(r'export const (\w+) = ', s)
    vals = {}
    for n in names:
        m = re.search(r'export const %s = (.*?);\n' % n, s, re.S)
        vals[n] = (m.start(1), m.end(1), json.loads(m.group(1)))
    return s, vals
def save(path, s, vals, new):
    # replace in reverse order of position
    items = sorted([(vals[n][0], vals[n][1], n) for n in new], reverse=True)
    for a, b, n in items: s = s[:a] + json.dumps(new[n], separators=(',', ':')) + s[b:]
    open(path, 'w').write(s)
def P(p): a = np.array(dec(p) if isinstance(p, str) else p, float).reshape(-1, 2) / 2.0; return a
def rast(polys, sc=1.0):
    m = np.zeros((H2 + 40, W2 + 40), np.uint8)
    for i, p in enumerate(polys):
        cv2.fillPoly(m, [np.int32(np.round((p + 20) * sc))], 1 if i == 0 else 0)
    return m
def clip_out(outer, holes, Z):
    """the part of a polygon (with holes) outside zone Z, re-contoured at 2x -> list of (outer, holes) in frame px"""
    S = 2
    m = np.zeros(((H2 + 40) * S, (W2 + 40) * S), np.uint8)
    cv2.fillPoly(m, [np.int32(np.round((outer + 20) * S))], 1)
    for h in holes: cv2.fillPoly(m, [np.int32(np.round((h + 20) * S))], 0)
    Zs = cv2.resize(Z, (m.shape[1], m.shape[0]), interpolation=cv2.INTER_NEAREST)
    m &= (1 - Zs)
    cs, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    if hier is None: return out
    for i, c in enumerate(cs):
        if hier[0][i][3] >= 0 or cv2.contourArea(c) < 2 * S * S: continue
        o = cv2.approxPolyDP(c, 0.35 * S, True).reshape(-1, 2) / S - 20
        hs = []; j = hier[0][i][2]
        while j >= 0:
            hs.append(cv2.approxPolyDP(cs[j], 0.35 * S, True).reshape(-1, 2) / S - 20); j = hier[0][j][0]
        out.append((o, hs))
    return out
E2 = lambda p: enc([int(round(v * 2)) for q in p for v in q])
def area_in(outer, holes, Z):
    m = rast([outer] + holes); inside = (m & Z).sum(); tot = m.sum()
    return inside / max(tot, 1), m
a = sys.argv[1:]
cmd, path, zone = a[0], a[1], np.array(json.loads(a[2]), float)
frac = float(a[a.index('--frac') + 1]) if '--frac' in a else 0.6
lines = [a[i + 1] for i in range(len(a)) if a[i] == '--line']
move = a[a.index('--move') + 1] if '--move' in a else None
CLIP = '--clip' in a
Z = np.zeros((H2 + 40, W2 + 40), np.uint8); cv2.fillPoly(Z, [np.int32(np.round(zone + 20))], 1)
s, vals = load(path)
RN = [n for n in vals if n.endswith('_REGIONS')][0]; IN = [n for n in vals if n.endswith('_INK')][0]
REG = vals[RN][2]; INK = vals[IN][2]
# raster of the key (colours) for inpainting
canvas = np.zeros((H2 + 40, W2 + 40, 3), np.float32); cov = np.zeros((H2 + 40, W2 + 40), np.uint8)
hexc = lambda c: np.array([int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)], np.float32)
keepR, movedR, vac = [], [], np.zeros_like(Z)
for r in REG:
    outer, holes = P(r[1]), [P(h) for h in r[2:]]
    f, m = area_in(outer, holes, Z)
    if f >= frac: movedR.append(r); vac |= m
    elif f > 0.0005 and CLIP:
        vac |= m & Z
        for o, hs in clip_out(outer, holes, Z):
            keepR.append([r[0], E2(o)] + [E2(h) for h in hs]); mm = rast([o] + hs); canvas[mm > 0] = hexc(r[0]); cov |= mm
    else:
        keepR.append(r); canvas[m > 0] = hexc(r[0]); cov |= m
keepI, movedI = [], []
for grp in INK:
    kp, mv = [grp[0]], [grp[0]]
    for poly in grp[1:]:
        outer, holes = P(poly[0]), [P(h) for h in poly[1:]]
        f, m = area_in(outer, holes, Z)
        if f >= frac: mv.append(poly); vac |= m
        elif f > 0.0005 and CLIP:
            mv.append(poly)
            for o, hs in clip_out(outer, holes, Z): kp.append([E2(o)] + [E2(h) for h in hs])
        else: kp.append(poly)
    if len(kp) > 1: keepI.append(kp)
    if len(mv) > 1: movedI.append(mv)
print('regions removed', len(movedR), 'of', len(REG), '| ink polys removed', sum(len(g) - 1 for g in movedI))
# vacated area = removed shapes not covered by kept regions, within the zone (dilated 2 px)
hole = (vac & (1 - cov)) | (Z & (1 - cov))
hole = cv2.dilate(hole, np.ones((3, 3), np.uint8)) & cv2.dilate(Z, np.ones((9, 9), np.uint8))
known = (cov > 0) & (hole == 0)
if '--src' in a:   # only these pixels feed the fill (e.g. the desk side of an edge line)
    SRC = np.zeros_like(Z); cv2.fillPoly(SRC, [np.int32(np.round(np.array(json.loads(a[a.index('--src') + 1]), float) + 20))], 1)
    known &= SRC > 0
# push-pull membrane fill from the known colours
def pushpull(I, M):
    h, w = M.shape
    if min(h, w) < 4: return np.where(M[..., None] > 0, I, (I * M[..., None]).sum((0, 1)) / max(M.sum(), 1e-6))
    Ic = cv2.resize(I * M[..., None], (w // 2, h // 2), interpolation=cv2.INTER_AREA); Mc = cv2.resize(M, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
    Ic = Ic / np.maximum(Mc, 1e-6)[..., None]; Mc = (Mc > 0.02).astype(np.float32)
    F = pushpull(Ic, Mc); up = cv2.resize(F, (w, h), interpolation=cv2.INTER_LINEAR)
    R = np.where(M[..., None] > 0, I, up)
    for _ in range(8): R = np.where(M[..., None] > 0, I, cv2.blur(R, (3, 3)))
    return R
ys, xs = np.nonzero(hole)
if len(xs):
    x0, x1, y0, y1 = max(0, xs.min() - 80), min(W2 + 40, xs.max() + 80), max(0, ys.min() - 80), min(H2 + 40, ys.max() + 80)
    I = canvas[y0:y1, x0:x1]; M = known[y0:y1, x0:x1].astype(np.float32)
    F = pushpull(I, M)
    for _ in range(30): F = np.where(M[..., None] > 0, I, cv2.blur(F, (7, 7)))
    hm = hole[y0:y1, x0:x1]
    pix = F[hm > 0]
    K = int(min(5, max(1, len(pix) // 400)))
    cv2.setRNGSeed(3)
    _, lb, cen = cv2.kmeans(pix.astype(np.float32), K, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.5), 3, cv2.KMEANS_PP_CENTERS)
    L = np.full(hm.shape, -1, np.int32); L[hm > 0] = lb.ravel()
    newR = []
    for k in range(K):
        mk = (L == k).astype(np.uint8)
        mk = cv2.morphologyEx(mk, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
        cs, hier = cv2.findContours(mk, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        if hier is None: continue
        col = '#%02x%02x%02x' % tuple(int(v) for v in cen[k])
        for i, c in enumerate(cs):
            if hier[0][i][3] >= 0 or cv2.contourArea(c) < 4: continue
            o = cv2.approxPolyDP(c, 0.8, True).reshape(-1, 2) + [x0 - 20, y0 - 20]
            hs = []
            j = hier[0][i][2]
            while j >= 0:
                hh = cv2.approxPolyDP(cs[j], 0.8, True).reshape(-1, 2) + [x0 - 20, y0 - 20]; hs.append(hh); j = hier[0][j][0]
            newR.append([col, enc([int(round(v * 2)) for q in o for v in q])] + [enc([int(round(v * 2)) for q in h for v in q]) for h in hs])
    print('fill regions', len(newR), 'colours', [tuple(int(v) for v in c) for c in cen])
    # fill regions go right after the regions they replace (before the smaller ones): simplest, append at the end
    keepR = keepR + newR
for L_ in lines:
    x0_, y0_, x1_, y1_, w_, col = L_.split(',')
    x0_, y0_, x1_, y1_, w_ = map(float, (x0_, y0_, x1_, y1_, w_))
    d = np.array([x1_ - x0_, y1_ - y0_]); d /= np.hypot(*d); n = np.array([-d[1], d[0]]) * w_ / 2
    q = [np.array([x0_, y0_]) + n, np.array([x1_, y1_]) + n, np.array([x1_, y1_]) - n, np.array([x0_, y0_]) - n]
    keepI.append([col, [enc([int(round(v * 2)) for p in q for v in p])]])
    print('line added', L_)
save(path, s, vals, {RN: keepR, IN: keepI})
if move:
    ds, dv = load(move)
    DR = [n for n in dv if n.endswith('_REGIONS')][0]; DI = [n for n in dv if n.endswith('_INK')][0]; DO = [n for n in dv if n.endswith('_OUTLINE')][0]
    out = P(dv[DO][2]); om = rast([out])
    for r in movedR: om |= rast([P(r[1])] + [P(h) for h in r[2:]])
    for g in movedI:
        for poly in g[1:]: om |= rast([P(poly[0])])
    om = cv2.morphologyEx(om, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    cs, _ = cv2.findContours(om, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea); o = cv2.approxPolyDP(c, 1.2, True).reshape(-1, 2) - 20
    newOut = enc([int(round(v * 2)) for q in o for v in q])
    save(move, ds, dv, {DR: dv[DR][2] + movedR, DI: dv[DI][2] + movedI, DO: newOut})
    print('moved into', move, 'outline', len(out), '->', len(o))
