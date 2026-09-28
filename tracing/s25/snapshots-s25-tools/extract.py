#!/usr/bin/env python3
# extract.py KEY  -- measure one pose of the standing owl on its source frame (spec in specs.py):
#   part silhouettes (bright regions bounded by ink, chosen by seed points, closed, holes filled, optional clip),
#   simplified to polygons; a parametric tone per part (plane + rim falloff fitted on the ungraded frame);
#   the dark ink shapes inside chosen parts (face features), simplified to polygons with one value each.
# Writes ../s25-meas/pose-KEY.json (frame px of the key frame) and an overlay ../s25-meas/pose-KEY.jpg.
# Only coordinates and a few scalars per shape are kept -- no pixels.
import cv2, numpy as np, json, sys, os
from regions import label
from grade import ungrade
import specs
HERE = os.path.dirname(os.path.abspath(__file__))
MEAS = os.path.join(HERE, '..', 's25-meas')
SRC = os.path.join(HERE, '..', 's25-src', 'f%05d.png')

def pre(f):
    p = os.path.join(MEAS, f'pre{f}.npy')
    if os.path.exists(p): return np.load(p).astype(np.float32).mean(2) / 255
    S = cv2.imread(SRC % f)[:, :, ::-1].astype(np.float32) / 255
    P = ungrade(S, f / 25); np.save(p, (P * 255).astype(np.uint8)); return P.mean(2)

def fillholes(m):
    ff = m.copy(); h, w = ff.shape; mm = np.zeros((h + 2, w + 2), np.uint8); cv2.floodFill(ff, mm, (0, 0), 1)
    return m | (1 - ff)

def poly_of(m, eps, holes=False):
    cs, _ = cv2.findContours(m, cv2.RETR_CCOMP if holes else cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cs:
        if cv2.contourArea(c) < 12: continue
        a = cv2.approxPolyDP(c, eps, True).reshape(-1, 2).astype(float)
        if len(a) >= 3: out.append(a)
    return out

def fit_tone(P, m, ink, cx, cy):
    # value = a + bx*(x-cx)/100 + by*(y-cy)/100 - rim*exp(-d/w)  on paper pixels (not ink) inside m; rim >= 0
    d = cv2.distanceTransform(m, cv2.DIST_L2, 5)
    sel = (m > 0) & (ink == 0) & (d > 1.0)
    ys, xs = np.nonzero(sel)
    if len(xs) < 30: return None
    v = P[ys, xs]; dd = d[ys, xs]
    A0 = np.stack([np.ones_like(v), (xs - cx) / 100.0, (ys - cy) / 100.0], 1)
    c0, *_ = np.linalg.lstsq(A0, v, rcond=None)
    best = (np.abs(A0 @ c0 - v).mean(), 6, np.array([*c0, 0.0]))
    dmax = d.max()
    for w in [2, 4, 7, 12, 20]:
        if w > dmax / 3: break
        A = np.stack([np.ones_like(v), (xs - cx) / 100.0, (ys - cy) / 100.0, -np.exp(-dd / w)], 1)
        c, *_ = np.linalg.lstsq(A, v, rcond=None)
        if c[3] < 0: continue
        e = np.abs(A @ c - v).mean()
        if e < best[0] - 0.001: best = (e, w, c)
    e, w, c = best
    return dict(a=round(float(c[0]), 4), bx=round(float(c[1]), 4), by=round(float(c[2]), 4), rim=round(float(c[3]), 4), rimw=w, c=[round(cx, 1), round(cy, 1)], err=round(float(e), 4))

def run(key):
    S = specs.POSES[key]
    f = S['frame']; T = S.get('T', 140)
    box = (0, 0, 2206, 946)
    g = cv2.imread(SRC % f, 0)
    LABS = {}
    def labels(T_, dil_):
        if (T_, dil_) not in LABS: LABS[(T_, dil_)] = label(f, T_, box, dil=dil_)
        return LABS[(T_, dil_)]
    lab, st, cen, inkm = labels(T, S.get('dil', 3))
    P = pre(f)
    gb = cv2.GaussianBlur(g, (0, 0), 0.7)
    # local ink map (darker than surroundings) for tone fitting
    bg = cv2.dilate(gb, np.ones((7, 7), np.uint8)).astype(np.float32)
    inkloc = ((bg - gb) > 18).astype(np.uint8)
    res = dict(key=key, frame=f, parts=[], ink=[])
    vis = cv2.cvtColor(g, cv2.COLOR_GRAY2BGR) // 2
    rng = np.random.RandomState(5)
    for part in S['parts']:
        lab = labels(part.get('T', T), part.get('dil', S.get('dil', 3)))[0]
        m = np.zeros_like(g, np.uint8)
        if part.get('mode') == 'range':
            # a dark part (headphone cup): pixels in [lo, hi] inside its clip, largest component
            cm = np.zeros_like(m); cv2.fillPoly(cm, [np.array(part['clip'], np.int32)], 1)
            gg = cv2.GaussianBlur(g, (0, 0), 1.0)
            mr = ((gg >= part['lo']) & (gg <= part['hi']) & (cm > 0)).astype(np.uint8)
            mr = cv2.morphologyEx(mr, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
            n_, l_, s_, c_ = cv2.connectedComponentsWithStats(mr)
            if n_ > 1: m |= (l_ == 1 + np.argmax(s_[1:, 4])).astype(np.uint8)
        for (x, y) in part.get('seeds', []):
            i = lab[y, x]
            if i == 0:
                w = lab[y - 8:y + 9, x - 8:x + 9].reshape(-1); w = w[w > 0]
                if len(w) == 0: print('seed on ink', part['name'], x, y); continue
                i = np.bincount(w).argmax()
            m |= (lab == i).astype(np.uint8)
        if part.get('grow_lo'):
            # grow into the mid-grey metal next to the bright part (the darker inner side of rings, bevels)
            lo = part['grow_lo']; r = part.get('grow_r', 6)
            midg = ((gb >= lo) & (gb < part.get('T', T) + 10)).astype(np.uint8)
            for _ in range(r):
                m = m | (cv2.dilate(m, np.ones((3, 3), np.uint8)) & midg)
        for pg in part.get('add', []):  # hand polygons added to the mask (hidden parts)
            cv2.fillPoly(m, [np.array(pg, np.int32)], 1)
        k = part.get('close', 7)
        if k > 1: m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
        if not part.get('holes'): m = fillholes(m)
        if 'clip' in part:
            cm = np.zeros_like(m); cv2.fillPoly(cm, [np.array(part['clip'], np.int32)], 1); m &= cm
        for pg in part.get('sub', []):
            cv2.fillPoly(m, [np.array(pg, np.int32)], 0)
        grow = part.get('grow', 1)
        mg = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1, 2 * grow + 1))) if grow > 0 else m
        polys = poly_of(mg, part.get('eps', 0.8), holes=bool(part.get('holes')))
        ys, xs = np.nonzero(m)
        cx, cy = float(xs.mean()), float(ys.mean())
        tone = fit_tone(P, m, inkloc, cx, cy)
        res['parts'].append(dict(name=part['name'], style=part.get('style', 'plume'), polys=[p.round(1).tolist() for p in polys], tone=tone,
                                 area=int(m.sum()), pen=part.get('pen', None), holes=bool(part.get('holes'))))
        col = rng.randint(80, 255, 3).tolist()
        for p in polys: cv2.polylines(vis, [p.astype(np.int32)], True, col, 1, cv2.LINE_AA)
        print(f"{part['name']:10s} area {int(m.sum()):6d} polys {len(polys)} pts {sum(len(p) for p in polys)} tone {tone}")
        if part.get('hl'):
            hk = part['hl']
            inner = cv2.erode(m, np.ones((3, 3), np.uint8))
            th = gb.astype(np.int16) - cv2.morphologyEx(gb, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (hk.get('k', 7),) * 2))
            dm = ((th > hk.get('d', 25)) & (inner > 0)).astype(np.uint8)
            n, il, ist, icen = cv2.connectedComponentsWithStats(dm)
            for j in range(1, n):
                if ist[j, 4] < hk.get('minA', 6): continue
                cm = (il == j).astype(np.uint8)
                v = float(np.percentile(P[cm > 0], 60))
                ps = poly_of(cm, 0.5, holes=True)
                if ps: res['ink'].append(dict(part=part['name'], p=[q.round(1).tolist() for q in ps], v=round(v, 3)))
        # ink shapes inside this part
        if part.get('ink'):
            ik = part['ink']
            inner = cv2.erode(m, np.ones((2 * ik.get('inset', 3) + 1,) * 2, np.uint8))
            if 'inkclip' in ik:
                cm = np.zeros_like(m); cv2.fillPoly(cm, [np.array(ik['inkclip'], np.int32)], 1); inner &= cm
            if ik.get('grey'):
                bh = cv2.morphologyEx(gb, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ik.get('k', 9),) * 2)).astype(np.int16) - gb
                dm = (((bh > ik['grey']) | (gb < ik.get('T', 150))) & (inner > 0)).astype(np.uint8)
            else:
                dm = ((gb < ik.get('T', 150)) & (inner > 0)).astype(np.uint8)
            n, il, ist, icen = cv2.connectedComponentsWithStats(dm)
            for j in range(1, n):
                if ist[j, 4] < ik.get('minA', 6): continue
                cm = (il == j).astype(np.uint8)
                vals = P[cm > 0]
                v = float(np.percentile(vals, 30))
                if ik.get('minLen'):
                    ys_, xs_ = np.nonzero(cm)
                    if max(xs_.ptp(), ys_.ptp()) < ik['minLen']: continue
                ps = poly_of(cm, ik.get('eps', 0.5), holes=True)
                if not ps: continue
                res['ink'].append(dict(part=part['name'], p=[q.round(1).tolist() for q in ps], v=round(v, 3)))
                cv2.fillPoly(vis, [q.astype(np.int32) for q in ps], (0, 0, 255))
    if S.get('scis'):
        allp = json.load(open(os.path.join(MEAS, 'scis.json')))
        res['scis'] = [dict(name=n, before=b, pl=allp[n]['pl']) for n, b in S['scis']]
    json.dump(res, open(os.path.join(MEAS, f'pose-{key}.json'), 'w'))
    bx = S.get('view', (560, 250, 1560, 946))
    cv2.imwrite(os.path.join(MEAS, f'pose-{key}.jpg'), cv2.resize(vis[bx[1]:bx[3], bx[0]:bx[2]], None, fx=1.4, fy=1.4))
    print('ink shapes', len(res['ink']), 'pts', sum(sum(len(q) for q in i['p']) for i in res['ink']))

if __name__ == '__main__':
    run(sys.argv[1])
