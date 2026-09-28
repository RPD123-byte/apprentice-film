#!/usr/bin/env python3
# extract2.py NAME FRAME [HULLKEY] [opts json] -- measure one owl drawing on its source frame (key-frame px):
#   hull   : the figure's outline (the earlier pass's measured outline ring HULLKEY, page space -> frame via CAM)
#   tier 1 : regions brighter than the line art (bounded by ink darker than T1) inside the hull -> polygons with holes
#   tier 2 : mid-grey regions (bounded by ink darker than T2) inside the hull, outside tier 1 (headphones, shadows)
#   tone   : a linear value plane per region (+ rim falloff), fitted on the ungraded frame
#   ink    : grey line shapes inside tier-1 regions (black-hat), one value each
# Writes ../s25-meas/pose-NAME.json (+ an overlay jpg). Coordinates and a few scalars only.
import cv2, numpy as np, json, sys, os
from grade import ungrade
HERE = os.path.dirname(os.path.abspath(__file__))
MEAS = os.path.join(HERE, '..', 's25-meas')
SRC = os.path.join(HERE, '..', 's25-src', 'f%05d.png')
MOT = json.load(open(os.path.join(MEAS, 'motion.json')))
OLD = json.load(open(os.path.join(MEAS, 'oldmasks.json')))

def cam(f):
    i = f - MOT['CAM_F0']
    if i < 0: return np.eye(3)
    c = MOT['CAM'][min(i, len(MOT['CAM']) - 1)]
    return np.array([[c[0], c[2], c[4]], [c[1], c[3], c[5]], [0, 0, 1]])

def pre(f):
    p = os.path.join(MEAS, f'pre{f}.npy')
    if os.path.exists(p): return np.load(p).astype(np.float32).mean(2) / 255
    S = cv2.imread(SRC % f)[:, :, ::-1].astype(np.float32) / 255
    P = ungrade(S, f / 25); np.save(p, (P * 255).astype(np.uint8)); return P.mean(2)

def polys(m, eps, holes=True):
    cs, hier = cv2.findContours(m, cv2.RETR_CCOMP if holes else cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cs:
        if len(c) < 3: continue
        a = cv2.approxPolyDP(c, eps, True).reshape(-1, 2).astype(float)
        if len(a) >= 3 and cv2.contourArea(a.astype(np.float32)) >= 2: out.append(a)
    return out

def plane(P, m, ok, d=None):
    ys, xs = np.nonzero(m & ok)
    if len(xs) < 12:
        ys, xs = np.nonzero(m)
        if len(xs) == 0: return None
    v = P[ys, xs]; cx, cy = xs.mean(), ys.mean()
    A = np.stack([np.ones_like(v), (xs - cx) / 100.0, (ys - cy) / 100.0], 1)
    c, *_ = np.linalg.lstsq(A, v, rcond=None)
    e0 = np.abs(A @ c - v).mean(); best = (e0, 6, [*c, 0.0])
    if d is not None and len(xs) > 200:
        dd = d[ys, xs]
        for w in [2, 4, 7, 12, 20]:
            if w > dd.max() / 3: break
            A2 = np.stack([A[:, 0], A[:, 1], A[:, 2], -np.exp(-dd / w)], 1)
            c2, *_ = np.linalg.lstsq(A2, v, rcond=None)
            if c2[3] < 0: continue
            e = np.abs(A2 @ c2 - v).mean()
            if e < best[0] - 0.002: best = (e, w, list(c2))
    e, w, c = best
    return [round(float(c[0]), 4), round(float(c[1]), 4), round(float(c[2]), 4), round(float(cx), 1), round(float(cy), 1), round(float(c[3]), 4), w]

def run(name, f, hullkey=None, o=None):
    o = o or {}
    T1, T2 = o.get('T1', 140), o.get('T2', 55)
    g = cv2.imread(SRC % f, 0)
    gb = cv2.GaussianBlur(g, (0, 0), 0.7)
    P = pre(f)
    # hull
    Hm = np.zeros_like(g, np.uint8)
    rings = []
    if hullkey:
        A = cam(f)
        for r in OLD[hullkey]['mask']:
            p = np.array(r, float).reshape(-1, 2)
            q = (A[:2, :2] @ p.T).T + A[:2, 2]
            rings.append(q)
            cv2.fillPoly(Hm, [np.round(q * 8).astype(np.int32)], 1, cv2.LINE_8, shift=3)
    for pg in o.get('hull_add', []): cv2.fillPoly(Hm, [np.array(pg, np.int32)], 1)
    for pg in o.get('hull_sub', []): cv2.fillPoly(Hm, [np.array(pg, np.int32)], 0)
    if o.get('plate'):
        # cut the hull where the frame shows the clean page (the chaos-phase plate): keep the figure only
        pl = cv2.imread(os.path.join(MEAS, o['plate']), 0).astype(np.int16)
        same = (np.abs(cv2.GaussianBlur(g, (0, 0), 1.5).astype(np.int16) - cv2.GaussianBlur(pl.astype(np.uint8), (0, 0), 1.5)) < o.get('plate_d', 14)).astype(np.uint8)
        same = cv2.morphologyEx(same, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
        Hm = Hm & (1 - same)
        Hm = cv2.morphologyEx(Hm, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        n_, l_, s_, _ = cv2.connectedComponentsWithStats(Hm)
        for i in range(1, n_):
            if s_[i, 4] < 60: Hm[l_ == i] = 0
        cs, _ = cv2.findContours(Hm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        rings = [cv2.approxPolyDP(c, 0.8, True).reshape(-1, 2).astype(float) for c in cs if cv2.contourArea(c) > 30]
    Hd = cv2.dilate(Hm, np.ones((5, 5), np.uint8))
    # tier 1
    ink1 = cv2.dilate((gb < T1).astype(np.uint8), np.ones((3, 3), np.uint8))
    n1, L1, S1, _ = cv2.connectedComponentsWithStats((1 - ink1) & Hd, connectivity=4)
    keep1 = np.zeros_like(g, np.uint8)
    parts = []
    minA = o.get('minA', 5)
    bg = cv2.dilate(gb, np.ones((7, 7), np.uint8)).astype(np.float32)
    okpx = ((bg - gb) < 18)
    if o.get('fitall', True):
        # fit tier-1 planes on every pixel except the grey line shapes that are drawn separately
        bhp = cv2.morphologyEx(gb, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))).astype(np.int16) - gb
        okpx = ~((bhp > o.get('grey', 20)) & (gb >= T1 - 4))
    for i in range(1, n1):
        if S1[i, 4] < minA: continue
        m = (L1 == i).astype(np.uint8)
        inside = (m & Hm).sum() / m.sum()
        if inside < 0.6: continue
        keep1 |= m
        mg = cv2.dilate(m, np.ones((3, 3), np.uint8))
        ps = polys(mg, o.get('eps1', 0.7))
        if not ps: continue
        d = cv2.distanceTransform(m, cv2.DIST_L2, 5) if S1[i, 4] > 400 else None
        parts.append(dict(tier=1, p=[q.round(1).tolist() for q in ps], t=plane(P, m > 0, okpx, d), area=int(S1[i, 4])))
    # tier 2: mid-grey regions (bounded by ink darker than T2) inside the hull and away from tier 1: the headphones,
    # shaded metal, the dark gaps' lighter parts; own tone plane
    ink2 = cv2.dilate((gb < T2).astype(np.uint8), np.ones((3, 3), np.uint8))
    free = Hd & (1 - cv2.dilate(keep1, np.ones((2 * o.get('gap2', 2) + 1,) * 2, np.uint8)))
    n2, L2, S2, _ = cv2.connectedComponentsWithStats((1 - ink2) & free, connectivity=4)
    for i in range(1, n2):
        if S2[i, 4] < o.get('minA2', 20): continue
        m = (L2 == i).astype(np.uint8)
        if (m & Hm).sum() / m.sum() < 0.6: continue
        mg = cv2.dilate(m, np.ones((3, 3), np.uint8))
        ps = polys(mg, o.get('eps2', 0.8))
        if not ps: continue
        parts.append(dict(tier=2, p=[q.round(1).tolist() for q in ps], t=plane(P, m > 0, np.ones_like(okpx)), area=int(S2[i, 4])))
    if o.get('tier2') == 0: parts = [q for q in parts if q['tier'] == 1]
    parts.sort(key=lambda q: (q['tier'] == 1, -q['area']))  # tier 2 first, then big to small
    # base: the hull's dark value
    rest = (Hm > 0) & (gb < T2)
    base = float(np.median(P[rest])) if rest.any() else 0.08
    # grey ink inside tier 1
    ink = []
    if o.get('grey', 20):
        bh = cv2.morphologyEx(gb, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))).astype(np.int16) - gb
        inner = cv2.erode(keep1, np.ones((3, 3), np.uint8))
        dm = ((bh > o.get('grey', 20)) & (inner > 0) & (gb >= T1 - 4)).astype(np.uint8)
        n, il, ist, _ = cv2.connectedComponentsWithStats(dm)
        for j in range(1, n):
            if ist[j, 4] < o.get('gminA', 6): continue
            if max(ist[j, 2], ist[j, 3]) < o.get('gminL', 5): continue
            cm = (il == j).astype(np.uint8)
            v = float(np.percentile(P[cm > 0], 35))
            ps = polys(cm, 0.5)
            if ps: ink.append(dict(p=[q.round(1).tolist() for q in ps], v=round(v, 3)))
    # dark line art: pixels darker than T1+dl near the tier-1 paper, split into two value classes, drawn over the parts
    if o.get('dark', True):
        near = cv2.dilate(keep1, np.ones((7, 7), np.uint8)) & Hm
        dk = ((gb < T1 + o.get('dl', 20)) & (near > 0))
        for lo, hi in o.get("bins", ((0, 0.1), (0.1, 0.22), (0.22, 0.4), (0.4, 1.01))):
            cls = (dk & (P >= lo) & (P < hi)).astype(np.uint8)
            cls = cv2.morphologyEx(cls, cv2.MORPH_CLOSE, np.ones((2, 2), np.uint8))
            n, il, ist, _ = cv2.connectedComponentsWithStats(cls)
            for j in range(1, n):
                if ist[j, 4] < 3: continue
                cm = (il == j).astype(np.uint8)
                v = float(np.median(P[cm > 0]))
                ps = polys(cm, 0.5)
                if ps: ink.insert(0, dict(p=[q.round(1).tolist() for q in ps], v=round(v, 3)))
    hullp = [q.round(1).tolist() for q in (rings if rings else [p for p in polys(Hm, 0.8, holes=False)])]
    res = dict(key=name, frame=f, base=round(base, 4), hull=hullp, parts=parts, ink=ink)
    # silhouette edge shade: value *= 1 - k * blur(outside, sigma), fitted on the figure (sigma-2 error)
    if o.get('edge', True):
        from paint2 import paint
        d0 = dict(res); img0, hull = paint(d0, P.shape)
        Pb = cv2.GaussianBlur(P, (0, 0), 2); sel = hull > 0
        best = (1e9, None)
        for sg in [2, 3, 5, 8, 12]:
            b = cv2.GaussianBlur((1 - hull).astype(np.float32), (0, 0), sg)
            for k in [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.3, 1.6]:
                e = np.abs(cv2.GaussianBlur(img0 * (1 - k * b), (0, 0), 2) - Pb)[sel].mean()
                if e < best[0]: best = (e, [k, sg])
        res['edge'] = best[1]
    json.dump(res, open(os.path.join(MEAS, f'pose-{name}.json'), 'w'))
    ys, xs = np.nonzero(Hm)
    print(f'{name} f{f}: tier1 {sum(1 for q in parts if q["tier"]==1)} tier2 {sum(1 for q in parts if q["tier"]==2)} ink {len(ink)} base {base:.3f} pts {sum(sum(len(r) for r in q["p"]) for q in parts)+sum(sum(len(r) for r in q["p"]) for q in ink)}')
    return res

if __name__ == '__main__':
    name, f = sys.argv[1], int(sys.argv[2])
    hk = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != '-' else None
    o = json.loads(sys.argv[4]) if len(sys.argv) > 4 else {}
    run(name, f, hk, o)
