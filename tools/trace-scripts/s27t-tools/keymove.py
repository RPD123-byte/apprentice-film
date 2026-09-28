# Move traced polygons between a room key and the designer key of the same frame (same frame-px x2 coordinates).
#   keymove.py r2d ROOMKEY.js DKEY.js ZONE_JSON [--fill-src SRC_JSON]
#       the part of ZONE outside the designer outline: room polygons there (clipped to it) go to the designer key, its
#       outline grows to cover them; the room key's vacated area is refilled (flat bands inpainted from --fill-src pixels)
#   keymove.py d2r ROOMKEY.js DKEY.js ZONE_JSON
#       the part of ZONE inside the designer outline: designer polygons there (clipped) go to the room key (on top), the
#       designer outline is cut back by the zone
import re, sys, json, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/tools/trace-scripts/s27t-tools')
from codec import enc, dec
W2, H2, S = 2206, 946, 2
def load(path):
    s = open(path).read(); vals = {}
    for n in re.findall(r'export const (\w+) = ', s):
        m = re.search(r'export const %s = (.*?);\n' % n, s, re.S); vals[n] = (m.start(1), m.end(1), json.loads(m.group(1)))
    return s, vals
def save(path, s, vals, new):
    for a_, b_, n in sorted([(vals[n][0], vals[n][1], n) for n in new], reverse=True): s = s[:a_] + json.dumps(new[n], separators=(',', ':')) + s[b_:]
    open(path, 'w').write(s)
def P(p): return np.array(dec(p), float).reshape(-1, 2) / 2.0
E2 = lambda p: enc([int(round(v * 2)) for q in p for v in q])
def rast(outer, holes=()):
    m = np.zeros(((H2 + 40) * S, (W2 + 40) * S), np.uint8)
    cv2.fillPoly(m, [np.int32(np.round((outer + 20) * S))], 1)
    for h in holes: cv2.fillPoly(m, [np.int32(np.round((h + 20) * S))], 0)
    return m
def contours(m, eps=0.35):
    cs, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE); out = []
    if hier is None: return out
    for i, c in enumerate(cs):
        if hier[0][i][3] >= 0 or cv2.contourArea(c) < 2 * S * S: continue
        o = cv2.approxPolyDP(c, eps * S, True).reshape(-1, 2) / S - 20; hs = []; j = hier[0][i][2]
        while j >= 0: hs.append(cv2.approxPolyDP(cs[j], eps * S, True).reshape(-1, 2) / S - 20); j = hier[0][j][0]
        out.append((o, hs))
    return out
def split(REG, INK, Z):
    """-> (kept REG, kept INK, moved REG, moved INK), every polygon clipped by the zone mask Z"""
    kR, mR, kI, mI = [], [], [], []
    for r in REG:
        m = rast(P(r[1]), [P(h) for h in r[2:]])
        if not (m & Z).any(): kR.append(r); continue
        for o, hs in contours(m & (1 - Z)): kR.append([r[0], E2(o)] + [E2(h) for h in hs])
        for o, hs in contours(m & Z): mR.append([r[0], E2(o)] + [E2(h) for h in hs])
    for g in INK:
        kp, mv = [g[0]], [g[0]]
        for poly in g[1:]:
            m = rast(P(poly[0]), [P(h) for h in poly[1:]])
            if not (m & Z).any(): kp.append(poly); continue
            for o, hs in contours(m & (1 - Z)): kp.append([E2(o)] + [E2(h) for h in hs])
            for o, hs in contours(m & Z): mv.append([E2(o)] + [E2(h) for h in hs])
        if len(kp) > 1: kI.append(kp)
        if len(mv) > 1: mI.append(mv)
    return kR, kI, mR, mI
a = sys.argv[1:]
cmd, rk, dk, zone = a[0], a[1], a[2], np.array(json.loads(a[3]), float)
rs, rv = load(rk); ds, dv = load(dk)
RR = [n for n in rv if n.endswith('_REGIONS')][0]; RI = [n for n in rv if n.endswith('_INK')][0]
DR = [n for n in dv if n.endswith('_REGIONS')][0]; DI = [n for n in dv if n.endswith('_INK')][0]; DO = [n for n in dv if n.endswith('_OUTLINE')][0]
out = P(dv[DO][2]); OM = rast(out)
Z = np.zeros_like(OM); cv2.fillPoly(Z, [np.int32(np.round((zone + 20) * S))], 1)
if cmd == 'r2d':
    Z &= (1 - OM)
    kR, kI, mR, mI = split(rv[RR][2], rv[RI][2], Z)
    # refill the vacated room area with inpainted flat bands (so the room never shows a hole between keys)
    col = np.zeros(Z.shape + (3,), np.float32); cov = np.zeros_like(Z)
    hexc = lambda c: np.array([int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)], np.float32)
    for r in kR:
        m = rast(P(r[1]), [P(h) for h in r[2:]]); col[m > 0] = hexc(r[0]); cov |= m
    known = (cov > 0) & (Z == 0)
    if '--fill-src' in a:
        SRC = np.zeros_like(Z); cv2.fillPoly(SRC, [np.int32(np.round((np.array(json.loads(a[a.index('--fill-src') + 1]), float) + 20) * S))], 1); known &= SRC > 0
    ys, xs = np.nonzero(Z)
    x0, x1, y0, y1 = max(0, xs.min() - 160), xs.max() + 160, max(0, ys.min() - 160), ys.max() + 160
    I = col[y0:y1, x0:x1]; M = known[y0:y1, x0:x1].astype(np.float32); F = I.copy()
    for rad in (64, 32, 16, 8, 4):
        for _ in range(6):
            num = cv2.blur(np.where(M[..., None] > 0, I, F) * 1.0, (rad * 2 + 1, rad * 2 + 1)); F = np.where(M[..., None] > 0, I, num)
    hm = Z[y0:y1, x0:x1]; pix = F[hm > 0]
    K = int(min(5, max(1, len(pix) // 1600))); cv2.setRNGSeed(3)
    _, lb, cen = cv2.kmeans(pix.astype(np.float32), K, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.5), 3, cv2.KMEANS_PP_CENTERS)
    L = np.full(hm.shape, -1, np.int32); L[hm > 0] = lb.ravel()
    fill = []
    for k in range(K):
        mk = np.zeros_like(Z); mk[y0:y1, x0:x1] = (L == k)
        mk = cv2.dilate(mk, np.ones((3, 3), np.uint8)) & cv2.dilate(Z, np.ones((5, 5), np.uint8))
        for o, hs in contours(mk, 0.8): fill.append(['#%02x%02x%02x' % tuple(int(v) for v in cen[k]), E2(o)] + [E2(h) for h in hs])
    save(rk, rs, rv, {RR: kR + fill, RI: kI})
    om = OM.copy()
    for r in mR: om |= rast(P(r[1]), [P(h) for h in r[2:]])
    om = cv2.morphologyEx(om, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    cs, _ = cv2.findContours(om, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); c = max(cs, key=cv2.contourArea)
    newO = cv2.approxPolyDP(c, 0.6 * S, True).reshape(-1, 2) / S - 20
    save(dk, ds, dv, {DR: dv[DR][2] + mR, DI: dv[DI][2] + mI, DO: E2(newO)})
    print('r2d: moved regions', len(mR), 'ink groups', len(mI), '| fill', len(fill), 'bands', [tuple(int(v) for v in c) for c in cen], '| outline', len(out), '->', len(newO))
else:
    Z &= OM
    kR, kI, mR, mI = split(dv[DR][2], dv[DI][2], Z)
    save(rk, rs, rv, {RR: rv[RR][2] + mR, RI: rv[RI][2] + mI})
    om = OM & (1 - Z)
    om = cv2.morphologyEx(om, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    cs, _ = cv2.findContours(om, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); c = max(cs, key=cv2.contourArea)
    newO = cv2.approxPolyDP(c, 0.6 * S, True).reshape(-1, 2) / S - 20
    save(dk, ds, dv, {DR: kR, DI: kI, DO: E2(newO)})
    print('d2r: moved regions', len(mR), 'ink groups', len(mI), '| outline', len(out), '->', len(newO))
