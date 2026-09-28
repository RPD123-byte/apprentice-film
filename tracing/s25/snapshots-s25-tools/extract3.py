#!/usr/bin/env python3
# extract3.py NAME FRAME HULLKEY [opts json] -- measure the GEOMETRY and LIGHT of one owl pose on its source frame:
#   hull  : the figure's outline rings (the earlier pass's measured outline ring, page space -> frame via CAM; for the
#           chaos owls cut where the frame shows the clean page)
#   parts : the MAJOR light areas (body, head, wing panels, feet, big metal pieces) — bright regions at least minA px,
#           after thin lines are closed and the face zone is merged — as smoothed outlines, each with a linear tone
#           plane (+ rim falloff) fitted on the ungraded frame; and the big mid-dark pieces (headphone cups and band)
#   fill  : one value for the rest of the figure (small feathers, line work) — drawn over by procedural strokes
# No line art is kept: the eyes, brows, beak, bandage and feather strokes are drawn by code elsewhere.
import cv2, numpy as np, json, sys, os
from extract2 import pre, cam, OLD, polys, plane, MEAS, SRC
HEADT = json.load(open(os.path.join(MEAS, 'headtrack.json')))

def run(name, f, hullkey, o=None):
    o = o or {}
    T1, T2 = o.get('T1', 125), o.get('T2', 55)
    minA, minA2 = o.get('minA', 700), o.get('minA2', 450)
    g = cv2.imread(SRC % f, 0); gb = cv2.GaussianBlur(g, (0, 0), 0.7); P = pre(f)
    Hm = np.zeros_like(g, np.uint8); rings = []
    A = cam(f)
    for r in (OLD[hullkey]['mask'] if hullkey != '-' else []):
        p = np.array(r, float).reshape(-1, 2); q = (A[:2, :2] @ p.T).T + A[:2, 2]
        cv2.fillPoly(Hm, [np.round(q * 8).astype(np.int32)], 1, cv2.LINE_8, shift=3)
    if o.get('plate'):
        pl = cv2.imread(os.path.join(MEAS, o['plate']), 0)
        same = (np.abs(cv2.GaussianBlur(g, (0, 0), 1.5).astype(np.int16) - cv2.GaussianBlur(pl, (0, 0), 1.5).astype(np.int16)) < 14).astype(np.uint8)
        same = cv2.morphologyEx(same, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
        Hm = Hm & (1 - same)
        Hm = cv2.morphologyEx(Hm, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    Hm = cv2.morphologyEx(Hm, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    def to_frame(pg):
        p = np.array(pg, float).reshape(-1, 2)
        if o.get('headspace'):
            hA = HEADT.get(str(f))
            if hA is None: return p
            a, b, c, d, e, ff = hA[:6]; M = cam(f) @ np.array([[a, c, e], [b, d, ff], [0, 0, 1]])
            p = (M[:2, :2] @ p.T).T + M[:2, 2]
        return p
    if o.get('clip'):
        cm = np.zeros_like(Hm); cv2.fillPoly(cm, [np.round(to_frame(o['clip'])).astype(np.int32)], 1); Hm &= cm
    if o.get('cut'):
        for pg in o['cut']:
            cm = np.zeros_like(Hm); cv2.fillPoly(cm, [np.round(to_frame(pg)).astype(np.int32)], 1); Hm &= (1 - cm)
    if o.get('hull_light'):
        # the figure = the bright plumage only (headphones and props drawn by code): largest bright component, closed
        lt = ((cv2.GaussianBlur(g, (0, 0), 1.2) >= o['hull_light']) & (Hm > 0)).astype(np.uint8)
        lt = cv2.morphologyEx(lt, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
        n_, l_, s_, _ = cv2.connectedComponentsWithStats(lt)
        Hm = (l_ == 1 + np.argmax(s_[1:, 4])).astype(np.uint8) if n_ > 1 else lt
        ff = Hm.copy(); mm = np.zeros((Hm.shape[0] + 2, Hm.shape[1] + 2), np.uint8); cv2.floodFill(ff, mm, (0, 0), 1); Hm |= (1 - ff)
        Hm = cv2.dilate(Hm, np.ones((3, 3), np.uint8))
        cs, _ = cv2.findContours(Hm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        rings = [cv2.approxPolyDP(c, 1.2, True).reshape(-1, 2).astype(float) for c in cs if cv2.contourArea(c) > 150]
    nolines = np.zeros_like(Hm)
    for pg in o.get('nolines', []): cv2.fillPoly(nolines, [np.round(to_frame(pg)).astype(np.int32)], 1)
    n_, l_, s_, _ = cv2.connectedComponentsWithStats(Hm)
    for i in range(1, n_):
        if s_[i, 4] < 200: Hm[l_ == i] = 0
    cs, _ = cv2.findContours(Hm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    rings = [cv2.approxPolyDP(c, 1.2, True).reshape(-1, 2).astype(float) for c in cs if cv2.contourArea(c) > 150]
    # light areas: not darker than T1, thin lines (< ~3 px) closed, face zone merged
    light = ((gb >= T1) & (Hm > 0)).astype(np.uint8)
    if o.get('close', 0): light = cv2.morphologyEx(light, cv2.MORPH_CLOSE, np.ones((o['close'],) * 2, np.uint8))
    face = np.zeros_like(light)
    for pg in o.get('face', []): cv2.fillPoly(face, [np.round(to_frame(pg)).astype(np.int32)], 1)
    dark2 = (gb < T2) & (cv2.erode(face, np.ones((1, 1), np.uint8)) > 0)
    light = np.where((face > 0) & ~dark2, 1, light).astype(np.uint8) if o.get('face_keep_dark') else np.where(face > 0, 1, light).astype(np.uint8)
    light &= Hm
    ink = cv2.dilate(1 - light, np.ones((3, 3), np.uint8))
    n1, L1, S1, _ = cv2.connectedComponentsWithStats((1 - ink) & Hm, connectivity=4)
    bg = cv2.dilate(gb, np.ones((7, 7), np.uint8)).astype(np.float32)
    bhp = cv2.morphologyEx(gb, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))).astype(np.int16) - gb
    okpx = ~((bhp > 14) & (gb >= T1 - 4)) & (face == 0) | ((face > 0) & (gb > 200))
    parts = []; keep1 = np.zeros_like(light)
    for i in range(1, n1):
        if S1[i, 4] < minA: continue
        m = (L1 == i).astype(np.uint8)
        keep1 |= m
        mg = cv2.dilate(m, np.ones((3, 3), np.uint8))
        ps = polys(mg, o.get('eps', 1.5))
        if not ps: continue
        d = cv2.distanceTransform(m, cv2.DIST_L2, 5)
        parts.append(dict(tier=1, p=[q.round(1).tolist() for q in ps], t=plane(P, m > 0, okpx, d), area=int(S1[i, 4])))
    # big mid-dark pieces (headphone cups, band, shaded metal)
    ink2 = cv2.dilate((gb < T2).astype(np.uint8), np.ones((3, 3), np.uint8))
    free = Hm & (1 - cv2.dilate(keep1, np.ones((5, 5), np.uint8)))
    n2, L2, S2, _ = cv2.connectedComponentsWithStats((1 - ink2) & free, connectivity=4)
    for i in range(1, n2):
        if S2[i, 4] < minA2: continue
        m = (L2 == i).astype(np.uint8)
        mg = cv2.dilate(m, np.ones((3, 3), np.uint8))
        ps = polys(mg, o.get('eps', 1.5))
        if not ps: continue
        parts.append(dict(tier=2, p=[q.round(1).tolist() for q in ps], t=plane(P, m > 0, np.ones_like(okpx)), area=int(S2[i, 4])))
    # black masses (the headphone band and cushions, the holes of the scissor rings): dark after thin lines are opened
    blk = cv2.morphologyEx(((gb < o.get('T0', 45)) & (Hm > 0)).astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    blk &= (1 - keep1)
    n0, L0, S0, _ = cv2.connectedComponentsWithStats(blk)
    keep0 = np.zeros_like(blk)
    for i in range(1, n0):
        if S0[i, 4] < o.get('minA0', 150): continue
        m = (L0 == i).astype(np.uint8); keep0 |= m
        ps = polys(m, o.get('eps', 1.5))
        if ps: parts.append(dict(tier=0, p=[q.round(1).tolist() for q in ps], t=[round(float(np.median(P[m > 0])), 4), 0, 0, 0, 0, 0, 6], area=int(S0[i, 4])))
    parts.sort(key=lambda q: (q['tier'], -q['area']))
    rest = (Hm > 0) & (keep1 == 0) & (keep0 == 0)
    fill = float(np.mean(P[rest])) if rest.sum() > 50 else 0.5
    dark = float(np.percentile(P[Hm > 0], 5))
    # the major ink lines (coarse polylines, one width / value each): dark line pixels inside the figure, not in the
    # black masses
    from lines import major_lines
    bhl = cv2.morphologyEx(gb, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))).astype(np.int16) - gb
    dk = (((bhl > o.get('BH', 30)) | (gb < o.get('TL', 90))) & (Hm > 0) & (cv2.dilate(keep0, np.ones((5, 5), np.uint8)) == 0)).astype(np.uint8)
    dk = cv2.morphologyEx(dk, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    dk &= (1 - nolines) & (1 - face)
    lns = major_lines(dk, P, minLen=o.get('minLen', 30), eps=o.get('leps', 2.0), maxN=o.get('maxN', 220))
    dots = []
    dm = ((gb < o.get('TD', 70)) & (Hm > 0) & (nolines == 0) & (face == 0)).astype(np.uint8)
    dm = cv2.morphologyEx(dm, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    nd, Ld, Sd, Cd = cv2.connectedComponentsWithStats(dm)
    for i in range(1, nd):
        a = Sd[i, 4]
        if a < 12 or a > 400: continue
        ys_, xs_ = np.nonzero(Ld == i)
        if len(xs_) < 5: continue
        (cx, cy), (ew, eh), ang = cv2.fitEllipse(np.stack([xs_, ys_], 1).astype(np.float32))
        if ew * eh * np.pi / 4 > a * 1.8 or max(ew, eh) > 3.2 * min(ew, eh): continue  # compact only
        dots.append([round(float(cx), 1), round(float(cy), 1), round(float(ew / 2), 1), round(float(eh / 2), 1), round(float(np.radians(ang)), 3), round(float(np.median(P[ys_, xs_])), 3)])
    res = dict(key=name, frame=f, base=round(fill, 3), dots=dots, dark=round(dark, 3), hull=[q.round(1).tolist() for q in rings], parts=parts, ink=[], lines=[dict(p=l['p'], w=l['w'], v=l['v']) for l in lns])
    # silhouette shade
    from paint2 import paint
    img0, hull = paint(dict(res, edge=None), P.shape)
    Pb = cv2.GaussianBlur(P, (0, 0), 2); sel = hull > 0; best = (1e9, None)
    for sg in [2, 3, 5, 8, 12]:
        b = cv2.GaussianBlur((1 - hull).astype(np.float32), (0, 0), sg)
        for k in [0, 0.2, 0.4, 0.6, 0.8, 1.0]:
            e = np.abs(cv2.GaussianBlur(img0 * (1 - k * b), (0, 0), 2) - Pb)[sel].mean()
            if e < best[0]: best = (e, [k, sg])
    res['edge'] = best[1]
    json.dump(res, open(os.path.join(MEAS, f'pose-{name}.json'), 'w'))
    print(f'{name} f{f}: parts {len([q for q in parts if q["tier"] == 1])} dark {len([q for q in parts if q["tier"] == 2])} fill {fill:.3f} pts {sum(sum(len(r) for r in q["p"]) for q in parts)}')
    return res

if __name__ == '__main__':
    name, f, hk = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    o = json.loads(sys.argv[4]) if len(sys.argv) > 4 else {}
    run(name, f, hk, o)
