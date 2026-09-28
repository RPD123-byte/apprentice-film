#!/usr/bin/env python3
# Measure the owl's wing silhouettes in flight (measurement script, not loaded by the film). Each SOURCE frame
# 16.00–19.12 s is warped into the owl's own frame (wing_local.py: owl units, root at the origin, bank removed), the white
# owl is segmented (bright, connected to the body, closed, holes filled), the body + head (the intersection of the
# silhouettes over contrasting wing poses) is removed, and each wing's outline is simplified to ~1.5 units.
# Output: per frame {f, L: [[u, v], ...], R: [...]} (owl units). Outlines only — no pixels are stored.
# Usage: measure_wings.py out.json dbgdir
import cv2, numpy as np, json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wing_local as wl
out, dbg = sys.argv[1:3]; os.makedirs(dbg, exist_ok=True)
U0, V0 = wl.U0, wl.V0
DBG_ALL = True
def fill_holes(m):
    ff = m.copy(); h, w = m.shape; mask = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(ff, mask, (0, 0), 1); return m | (1 - ff)
def bright(Lp, thr):
    b = cv2.GaussianBlur(Lp, (0, 0), 1.2)
    m = (b > thr).astype(np.uint8)
    return cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
def silhouette(Lp, thr=0.74):
    m = bright(Lp, thr)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    k = lab[-V0 - 30, -U0]                             # a body pixel (just above the root)
    if k == 0: k = lab[-V0 + 20, -U0]
    return fill_holes((lab == k).astype(np.uint8))
frames = list(range(397, 479))          # 15.88 (the wings leave the sides) .. 19.12
# over the box top and the lit cartons (16.00–17.40) 0.74; over the dark room a lower threshold keeps the grey partings between
# the primaries inside the silhouette
THR = {f: (0.74 if f <= 435 else 0.55) for f in frames}
LOC = {f: wl.local(f)[0] for f in frames}
S = {f: silhouette(LOC[f]) for f in (409, 418, 445, 415, 460, 448, 466)}
# body = what every clean silhouette shares (wings up at 16.36/16.72/17.80, level 16.60/18.40, down 17.92/18.64)
body = None
for f in S: body = S[f] if body is None else body & S[f]
body = cv2.morphologyEx(body, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
cv2.imwrite(f'{dbg}/body.png', body * 255)
# what is cut away is the measured flying body (trace_owl.py's region; the intersection above also holds the wing
# roots every pose shares, so it is only a fallback)
FLYREG = os.environ.get('FLYREG')
BODYX = cv2.dilate((cv2.imread(FLYREG, 0) > 0).astype(np.uint8), np.ones((5, 5), np.uint8)) if FLYREG else cv2.dilate(body, np.ones((11, 11), np.uint8))
# each wing is then grown up to 25 units into the measured flying body (trace_owl.py's region), so it tucks under the
# body drawing, which is drawn over it
FLY = cv2.dilate((cv2.imread(FLYREG, 0) > 0).astype(np.uint8), np.ones((5, 5), np.uint8)) if FLYREG else None
res = []
tiles = []
for f in frames:
    m = silhouette(LOC[f], THR[f]); m[BODYX > 0] = 0
    # a wing lies within reach of its shoulder (+-104, -44): 470 units; nothing of it below the body's middle near the axis
    yy, xx = np.mgrid[0:m.shape[0], 0:m.shape[1]]; uu = xx + U0; vv = yy + V0
    reach = (np.hypot(np.abs(uu) - 104, vv + 44) < 470) & ~((np.abs(uu) < 150) & (vv < -150))
    if f <= 405: reach &= ~(vv > 120)                         # perched: the box top (v ~128) is not wing
    elif f <= 435: reach &= ~((np.abs(uu) < 150) & (vv > 75))   # over the lit boxes: no box edges hanging under the body
    m[~reach] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    rec = {'f': f}
    for side, sel in (('L', slice(0, -U0)), ('R', slice(-U0, None))):
        mm = np.zeros_like(m); mm[:, sel] = m[:, sel]
        n, lab, st, _ = cv2.connectedComponentsWithStats(mm)
        if n < 2: rec[side] = None; continue
        k = 1 + int(np.argmax(st[1:, 4]))
        if st[k, 4] < 800: rec[side] = None; continue
        wm = fill_holes((lab == k).astype(np.uint8))
        if FLY is not None: wm = wm | (cv2.dilate(wm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (51, 51))) & FLY)
        cs, _ = cv2.findContours(wm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        c = max(cs, key=cv2.contourArea)
        q = cv2.approxPolyDP(c, 1.5, True)[:, 0, :].astype(float)
        rec[side] = [[round(x + U0, 1), round(y + V0, 1)] for x, y in q]
        rec[side + 'area'] = int(st[k, 4])
    res.append(rec)
    Lp = LOC[f] if DBG_ALL or f % 6 == 0 else None
    if Lp is not None:
        im = cv2.cvtColor((np.clip(Lp, 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
        for side, col in (('L', (0, 0, 255)), ('R', (255, 0, 0))):
            if rec.get(side):
                q = np.array([[x - U0, y - V0] for x, y in rec[side]], np.int32)
                ov = im.copy(); cv2.fillPoly(ov, [q], col); im = cv2.addWeighted(im, 0.55, ov, 0.45, 0); cv2.polylines(im, [q], True, col, 2)
        cv2.putText(im, '%.2f' % (f / 25), (5, 30), 0, 1, (0, 255, 255), 2)
        tiles.append(cv2.resize(im, (280, 200)))
    print(f, f / 25, {k: v for k, v in rec.items() if 'area' in k}, flush=True)
while len(tiles) % 8: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(f'{dbg}/wings.jpg', np.vstack([np.hstack(tiles[i:i + 8]) for i in range(0, len(tiles), 8)]))
# temporal check: a wing mask that overlaps its neighbours' (f+-1, f+-2) poorly is a segmentation failure (lit cartons
# merged, or the wing lost against them); those frames are morphed from the nearest good ones (outlines resampled to
# 120 points by arc length, starting from the point nearest the shoulder)
def rast(q):
    m = np.zeros((V1 - V0, U1 - U0), np.uint8)
    if q: cv2.fillPoly(m, [np.round(np.array(q) - [U0, V0]).astype(np.int32)], 1)
    return m
U1, V1 = wl.U1, wl.V1
def resample(q, side, n=120):
    q = np.array(q, float); sh = np.array([side * 104, -44.0])
    i0 = int(np.argmin(np.hypot(*(q - sh).T))); q = np.roll(q, -i0, axis=0)
    # consistent winding: counter-clockwise in image coords
    if np.sum(q[:, 0] * np.roll(q[:, 1], -1) - np.roll(q[:, 0], -1) * q[:, 1]) < 0: q = q[::-1]; q = np.roll(q, 1, axis=0)
    seg = np.hypot(*np.diff(np.vstack([q, q[:1]]), axis=0).T); cum = np.concatenate([[0], np.cumsum(seg)])
    t = np.linspace(0, cum[-1], n, endpoint=False)
    return np.stack([np.interp(t, cum, np.append(q[:, k], q[0, k])) for k in (0, 1)], 1)
# failures found by inspecting every frame's outline (snapshots/s02-wing/wings.jpg): the left wing is lost against the lit
# cartons or merged with a box edge on these frames; the right wing is clean throughout
BAD = {'L': {414, 415, 416, 417, 418, 419, 421, 422}, 'R': {437}}
# the left-wing failures fall where the flap is near-symmetric (bank <= 0.2 rad): the right wing, mirrored, stands in
MIRROR_L = True
byf0 = {r['f']: r for r in res}
if MIRROR_L:
    for f in sorted(BAD['L']):
        byf0[f]['L'] = [[-x, y] for x, y in reversed(byf0[f]['R'])]; byf0[f]['Lmirror'] = True
    BAD['L'] = set()
for side, sd in (('L', -1), ('R', 1)):
    good = [r['f'] for r in res if r['f'] not in BAD[side]]
    byf = {r['f']: r for r in res}
    for f in sorted(BAD[side]):
        a = max([g for g in good if g < f], default=None); b = min([g for g in good if g > f], default=None)
        if a is None or b is None:
            src = byf[a if a is not None else b][side]; byf[f][side] = src; continue
        u = (f - a) / (b - a)
        qa, qb = resample(byf[a][side], sd), resample(byf[b][side], sd)
        byf[f][side] = np.round(qa * (1 - u) + qb * u, 1).tolist(); byf[f][side + 'morph'] = [a, b]
print('bad L', sorted(BAD['L'])); print('bad R', sorted(BAD['R']))
json.dump(res, open(out, 'w'))

# ---- the wings' interiors: brightness levels inside each final outline, per frame (owl units, from the warped frame)
import levels as lv
WLEV = [0.6, 0.72, 0.82, 0.9]
byf = {r['f']: r for r in res}
def interior(f, side):
    q = byf[f][side]
    m = np.zeros((V1 - V0, U1 - U0), np.uint8); cv2.fillPoly(m, [np.round(np.array(q) - [U0, V0]).astype(np.int32)], 1)
    P = cv2.GaussianBlur(LOC[f], (0, 0), 0.8)
    ms = [m] + [((P > t) & (m > 0)).astype(np.uint8) for t in WLEV]
    ms = [ms[0]] + [cv2.morphologyEx(x, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)) for x in ms[1:]]
    return lv.stack(P, ms, off=(U0, V0), eps=1.5, minarea=10, tile=100000)
INK = {}
for r in res:
    f = r['f']; INK[f] = {}
    for side in ('L', 'R'):
        src_f, src_side, mirror = f, side, False
        if r.get(side + 'mirror'): src_side, mirror = 'R', True
        if r.get(side + 'morph'): src_f = r[side + 'morph'][0]
        L = interior(src_f, src_side)
        if mirror: L = [[{**s, 'r': [[[-x, y] for x, y in qq] for qq in s['r']]} for s in lev] for lev in L]
        INK[f][side] = L
json.dump({str(k): v for k, v in INK.items()}, open(out.replace('.json', '-ink.json'), 'w'))
print('interiors', sum(len(s['r'][0]) for f in INK for side in INK[f] for lev in INK[f][side] for s in lev), 'points')
