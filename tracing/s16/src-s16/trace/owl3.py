#!/usr/bin/env python3
# s16 owl, third pass (fix 1): the flying owl redrawn from authored parts placed on measured landmarks, replacing
# owl2.py's dense cel levels (see fidelity/s16.md). Input: the previous drawings (owl2.py's output, exported once to
# snapshots/s16-fix1-work/owl2_data.json) for the silhouette, the smooth plumage study, the ink centre-lines, the
# eyes and the dark regions; the source frames (pre-grade) only to measure a few numbers per part.
# Output per drawing (data/owl.js, geometry and a few values only):
#   sil   the silhouette, smoothed (3-point moving average, twice)
#   G     the plumage's light as a COARSE value study: an 8 px grid of the old smooth study (sigma 3) quantised to at
#         most 8 levels (k-means per drawing); painted upsampled and blurred, under grain and stipple
#   HP    the headphones (flight): the dark outline of band + cups (one smooth outline, one value), the band's pale
#         edge as a centre-line, and each cup as fitted ellipse parameters (drawn in owl.js as pad, rim and face
#         ellipses with a specular streak)
#   N     the small dark parts (the notches between feathers, talons, the beak's shade) as tapered ink strokes:
#         medial axis of each dark region, width = 2 x distance to its edge, value = the source's darkest there
#   S, KL, C, E, O   unchanged (ink centre-lines, eye whites, cable, fitted eyes, outline)
# usage: owl3.py [frames]        (writes data/owl.js when every drawing is done; per-drawing cache in fix1-work)
#        owl3.py cal RAWDIR gain  light matching of G against raw harness renders r{f}.png
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
import m16, cv2, numpy as np
from skimage.morphology import skeletonize

ROOT = m16.ROOT
m16.PRE = ROOT + '/snapshots/s16-fix1-src'
WORK = ROOT + '/snapshots/s16-fix1-work'
OUT = os.environ.get('OWL_OUT', os.path.join(os.path.dirname(__file__), '..', 'data', 'owl.js'))
OLD = json.load(open(WORK + '/owl2_data.json'))
ALL = [f for f in range(1143, 1164) if f != 1146] + [1175]
SEAT = (1162, 1163, 1175)
# the seated owl's graphic parts (zones read off 2x / 4x grids of 1175, frame px = plate px) and each seated
# drawing's offset from 1175 (template-matched, owl2.py)
SEAT_OFF = {1175: (0, 0), 1163: (1, -3), 1162: (3, -1)}
SEAT_ZONES = [[(345, 700), (345, 640), (355, 605), (375, 580), (410, 560), (450, 553), (490, 563), (508, 585), (497, 602), (470, 592),
               (440, 588), (410, 598), (392, 616), (388, 650), (422, 663), (442, 700), (438, 746), (410, 762), (368, 760), (348, 742)],
              [(585, 815), (650, 815), (655, 912), (585, 912)], [(668, 785), (722, 785), (722, 878), (668, 878)],
              [(572, 640), (590, 604), (640, 598), (692, 636), (708, 700), (702, 748), (660, 752), (620, 722), (592, 692), (578, 672)],
              [(278, 634), (342, 622), (348, 682), (300, 692)]]
CELL = 8
BANDW = float(os.environ.get('BANDW', 8.5))     # the flying owl's headphone band: its width from the outline inward (px)
_E = None
CAMS = {}
import re
for _m in re.finditer(r'(\d+): \[([^\]]+)\]', open(os.path.join(os.path.dirname(__file__), '..', 'data', 'cams.js')).read()):
    CAMS[int(_m.group(1))] = [float(v) for v in _m.group(2).split(',')]


def room_model(f):
    """the clean static room plate (build_plate.py) moved by frame f's camera, frame px (no irises, no steam)"""
    global _E
    if _E is None: _E = m16.plateE()
    M = m16.M
    a, b, tx, c, d, ty = CAMS.get(f, [1, 0, 0, 0, 1, 0])
    A = np.array([[a, b, tx - (a + b) * M], [c, d, ty - (c + d) * M]], np.float32)
    return cv2.warpAffine(_E, A, (m16.W, m16.H), flags=cv2.INTER_LINEAR)


def raster_rings(rings, shape, off, ss=1):
    m = np.zeros((shape[0] * ss, shape[1] * ss), np.uint8)
    for r in rings:
        p = np.round((np.array(r, float).reshape(-1, 2) - off) * ss * 16).astype(np.int32)
        t = np.zeros_like(m); cv2.fillPoly(t, [p], 1, shift=4); m ^= t
    if ss > 1: return cv2.resize(m.astype(np.float32), (shape[1], shape[0]), interpolation=cv2.INTER_AREA)
    return m


def resample(a, step=1.5):
    """a closed ring resampled at ~step px"""
    b = np.vstack([a, a[:1]])
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(b, axis=0).T))]
    n = max(8, int(d[-1] / step))
    t = np.linspace(0, d[-1], n, endpoint=False)
    return np.stack([np.interp(t, d, b[:, 0]), np.interp(t, d, b[:, 1])], 1)


def smooth_ring(r, it=2, simplify=0.35):
    """3-point moving average on the ring resampled at 1.5 px (it passes), then simplified"""
    a = resample(np.array(r, float).reshape(-1, 2))
    for _ in range(it): a = (np.roll(a, 1, 0) + a + np.roll(a, -1, 0)) / 3
    if simplify <= 0: return a
    j = int(np.argmax(np.hypot(a[:, 0] - a[0, 0], a[:, 1] - a[0, 1])))
    return np.vstack([m16.rdp(a[:j + 1], simplify)[:-1], m16.rdp(np.vstack([a[j:], a[:1]]), simplify)[:-1]])


def old_shading(d, shape, off):
    """the previous drawing's smooth plumage study (base + L levels, even-odd, blurred as owl.js drew it)"""
    V = np.full(shape, d['base'], np.float32)
    for it in d['L']:
        m = raster_rings(it[1:], shape, off, 2)
        V = V * (1 - m) + m * it[0] / 1000
    return cv2.GaussianBlur(V, (0, 0), 3.0)


def kmeans1(x, w, k):
    c = np.quantile(x, np.linspace(0.02, 0.98, k))
    for _ in range(40):
        a = np.argmin(np.abs(x[:, None] - c[None]), 1)
        for j in range(k):
            s = a == j
            if s.any(): c[j] = np.average(x[s], weights=w[s])
    return np.sort(c)


def coarse_grid(V, mask, off, fix=None):
    """8 px grid of V (extrapolated outside the mask so edge cells are not darkened), <= 8 levels"""
    mc = mask.astype(np.float32)
    ext = cv2.GaussianBlur(V * mc, (0, 0), 6) / np.maximum(1e-3, cv2.GaussianBlur(mc, (0, 0), 6))
    for _ in range(3):
        ext = np.where(mc > 0, V, ext); ext = cv2.GaussianBlur(ext, (0, 0), 4)
    Vx = np.clip(np.where(mc > 0, V, ext), 0, 1)
    h, w = V.shape; nx, ny = (w + CELL - 1) // CELL + 1, (h + CELL - 1) // CELL + 1
    P = np.pad(Vx, ((0, ny * CELL - h), (0, nx * CELL - w)), mode='edge')
    Mp = np.pad(mc, ((0, ny * CELL - h), (0, nx * CELL - w)))
    g = cv2.resize(P, (nx, ny), interpolation=cv2.INTER_AREA)
    gw = cv2.resize(Mp, (nx, ny), interpolation=cv2.INTER_AREA)
    if fix is not None: g = np.clip(g + fix, 0, 1)
    ins = gw > 0.05
    lv = kmeans1(g[ins], gw[ins] + 0.05, 8)
    q = np.argmin(np.abs(g[..., None] - lv[None, None]), 2).astype(np.uint8)
    return dict(x0=float(off[0]), y0=float(off[1]), c=CELL, nx=int(nx), ny=int(ny), lv=[round(float(v), 3) for v in lv],
                q=''.join(str(int(v)) for v in q.ravel())), g


def longest_path(comp):
    sk = skeletonize(comp > 0).astype(np.uint8)
    P = m16._paths(sk)
    if not P:
        ys, xs = np.nonzero(comp)
        if len(xs) < 2: return None
        c = np.array([xs.mean(), ys.mean()])
        u, s, vt = np.linalg.svd(np.stack([xs - c[0], ys - c[1]], 1), full_matrices=False)
        L = max(1.0, s[0] / np.sqrt(len(xs)) * 1.7)
        return np.array([c - vt[0] * L, c + vt[0] * L])
    P = m16._merge(P, rad=4, align=0.5)
    return max(P, key=lambda p: np.sum(np.hypot(*np.diff(p, axis=0).T)) if len(p) > 1 else 0)


def comp_strokes(mask, Y1, sil, off, minarea=12, extend=True):
    """medial-axis strokes of the dark regions in mask: [[x, y, w, v], ...]"""
    out = []
    n, lab, st, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8))
    dt = cv2.distanceTransform(mask.astype(np.uint8), cv2.DIST_L2, 5)
    outside = cv2.distanceTransform(sil.astype(np.uint8), cv2.DIST_L2, 5)
    for i in range(1, n):
        if st[i, 4] < minarea: continue
        comp = (lab == i).astype(np.uint8)
        P = longest_path(comp)
        if P is None or len(P) < 2: continue
        if len(P) > 5:
            k = np.ones(3) / 3; A = P.copy(); A[1:-1, 0] = np.convolve(P[:, 0], k, 'valid'); A[1:-1, 1] = np.convolve(P[:, 1], k, 'valid'); P = A
        P = m16.rdp(P, 0.5)
        pts = [list(p) for p in P]
        # an end that reaches the silhouette's edge (a notch opening onto the dark) runs on past it
        if extend:
            for e in (0, -1):
                p = np.array(pts[e]); q = np.array(pts[1 if e == 0 else -2])
                xi, yi = int(np.clip(round(p[0]), 0, sil.shape[1] - 1)), int(np.clip(round(p[1]), 0, sil.shape[0] - 1))
                if outside[yi, xi] < dt[yi, xi] + 4:
                    t = p - q; t /= np.linalg.norm(t) + 1e-9
                    ext = list(p + t * (outside[yi, xi] + 3))
                    if e == 0: pts.insert(0, ext)
                    else: pts.append(ext)
        row = []
        for x, y in pts:
            xi, yi = int(np.clip(round(x), 0, mask.shape[1] - 1)), int(np.clip(round(y), 0, mask.shape[0] - 1))
            w = 2 * float(max(dt[yi, xi], 0.5)) + 0.4
            if comp[yi, xi] == 0:     # extension past the edge: keep the neighbour's width
                w = row[-1][2] if row else 2.0
            v = float(np.clip(Y1[yi, xi], 0, 1))
            row.append([round(x + off[0], 1), round(y + off[1], 1), round(min(w, 12), 1), round(v, 2)])
        if row and not (comp[int(np.clip(round(pts[0][1]), 0, mask.shape[0] - 1)), int(np.clip(round(pts[0][0]), 0, mask.shape[1] - 1))]):
            row[0][2] = row[1][2] if len(row) > 1 else row[0][2]; row[0][3] = row[1][3] if len(row) > 1 else row[0][3]
        out.append(row)
    return out


def eye_mask(d, shape, off, grow=3):
    z = np.zeros(shape, np.uint8)
    for e in d.get('E', []):
        sw, sh = e[8], e[9]
        cx, cy, w, h, a = (e[6], e[7], sw, sh, e[10]) if sw > 0 else (e[1], e[2], e[3] * 1.55, e[4] * 1.5, e[5])
        cv2.ellipse(z, ((float(cx - off[0]), float(cy - off[1])), (float(w + 2 * grow), float(h + 2 * grow)), float(a)), 1, -1)
    return z


def headphones(hp, Y, Y1, sil, off, head_c):
    """band + cups: one outline, the cups as ellipse parameters, the band's pale outer edge"""
    Y2 = cv2.GaussianBlur(Y, (0, 0), 2.0)
    from scipy import ndimage as ndi
    holes = (ndi.binary_fill_holes(hp > 0) & (hp == 0)).astype(np.uint8)
    nh, lh, sh_, _ = cv2.connectedComponentsWithStats(holes)
    for i in range(1, nh):
        if sh_[i, 4] < 300: hp = hp | (lh == i).astype(np.uint8)
    hs = (cv2.GaussianBlur(cv2.dilate(hp, np.ones((3, 3), np.uint8)).astype(np.float32), (0, 0), 1.5) > 0.5).astype(np.uint8)
    rings = m16.isolines(cv2.GaussianBlur(hs.astype(np.float32), (0, 0), 1.0), 0.5, 0.5, 30, off)
    rings = [smooth_ring(r, 2) for r in rings]
    cup = ((Y2 > 0.16) & (hp > 0)).astype(np.uint8)
    cup = cv2.morphologyEx(cup, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    n, lab, st, cen = cv2.connectedComponentsWithStats(cup)
    cups = []; cupm = np.zeros_like(hp)
    for i in range(1, n):
        if st[i, 4] < 700: continue
        comp = (lab == i).astype(np.uint8)
        comp = cv2.morphologyEx(comp, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
        cs, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        c = max(cs, key=len)
        if len(c) < 6: continue
        (cx, cy), (a1, a2), ang = cv2.fitEllipse(c)
        # u: from the cup toward the head (the pad side)
        u = np.array(head_c) - np.array([cx + off[0], cy + off[1]]); u /= np.linalg.norm(u) + 1e-9
        ys, xs = np.nonzero(comp)
        s = (xs - cx) * u[0] + (ys - cy) * u[1]
        lo, hi = np.percentile(s, [5, 95])
        near = s > lo + 0.66 * (hi - lo); far = s < lo + 0.4 * (hi - lo)
        vals = Y1[ys, xs]
        vpad = float(np.median(vals[near])); vface = float(np.median(vals[far])); vhi = float(np.percentile(vals[far], 97))
        # a poor fit (the blob is a sliver of a cup behind the head, or runs into the band): drawn as a plain tone
        plain = 1 if np.pi * (a1 / 2) * (a2 / 2) > 1.45 * comp.sum() else 0
        if plain: vface = float(np.mean(vals))
        cups.append([round(cx + off[0], 1), round(cy + off[1], 1), round(a1 / 2, 1), round(a2 / 2, 1), round(ang, 1),
                     round(float(u[0]), 3), round(float(u[1]), 3), round(vpad, 3), round(vface, 3), round(vhi, 3), plain])
        cupm |= comp
    # light parts caught in the dark region that are not cups (the tuft on the head): back to the plumage
    lite = ((Y2 > 0.3) & (hp > 0) & (cv2.dilate(cupm, np.ones((9, 9), np.uint8)) == 0)).astype(np.uint8)
    lite = cv2.morphologyEx(lite, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    if lite.any():
        hs2 = hs & (cv2.dilate(lite, np.ones((3, 3), np.uint8)) == 0)
        rings = [smooth_ring(r, 2) for r in m16.isolines(cv2.GaussianBlur(hs2.astype(np.float32), (0, 0), 1.0), 0.5, 0.5, 30, off)]
    band = hp & (cv2.dilate(cupm, np.ones((5, 5), np.uint8)) == 0) & (lite == 0)
    # the band proper (a dark grey strip) and the black gap between it and the head (the dark room seen through):
    # the whole dark shape is painted the gap's black, the band's own outline on top in its grey
    Y15 = cv2.GaussianBlur(Y, (0, 0), 1.5)
    gapm = (band & (Y15 < 0.05)).astype(np.uint8)
    gapm = cv2.morphologyEx(gapm, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    dext = cv2.distanceTransform(sil.astype(np.uint8), cv2.DIST_L2, 5)
    bandm = (hs & (dext <= BANDW) & (cv2.dilate(cupm, np.ones((3, 3), np.uint8)) == 0)).astype(np.uint8)
    if lite.any(): bandm &= (cv2.dilate(lite, np.ones((3, 3), np.uint8)) == 0)
    bandm = cv2.morphologyEx(bandm, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    brings = [smooth_ring(r, 2) for r in m16.isolines(cv2.GaussianBlur(bandm.astype(np.float32), (0, 0), 1.0), 0.5, 0.5, 30, off)]
    vgap = float(np.median(Y1[gapm > 0])) if gapm.any() else 0.02
    vband = float(np.mean(Y1[bandm > 0])) if bandm.any() else 0.1
    # the band's pale edges and slider marks: centre-lines of the pale lines inside it (the s12 method)
    bz = cv2.dilate(band, np.ones((5, 5), np.uint8)) & sil
    PL = m16.strokes(Y, 'pale', mask=bz, sigmas=(0.8, 1.2), hi=0.04, lo=0.02, dmin=0.06, minlen=6, eps=0.6, smooth=3, win=9, off=off)
    PL = [[v for p_ in s_ for v in (p_[0], p_[1], min(2.0, max(0.8, p_[2] * 0.7)), p_[3])] for s_ in PL]
    # the band's pale outer edge: the outline points of the band farther from the head centre, 2.5 px inside
    hl = []
    cs, _ = cv2.findContours(band, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if cs:
        c = max(cs, key=len)[:, 0, :].astype(float)
        hc = np.array(head_c) - off
        r = np.hypot(c[:, 0] - hc[0], c[:, 1] - hc[1])
        dtb = cv2.distanceTransform(band, cv2.DIST_L2, 5)
        # outer: radius above the local band median -> the run of the contour with the largest radius
        k = 15; rs = np.convolve(np.r_[r[-k:], r, r[:k]], np.ones(2 * k + 1) / (2 * k + 1), 'valid')
        outer = r > rs
        # the longest cyclic run of outer points
        idx = np.nonzero(outer)[0]
        if len(idx):
            runs = []; st_ = idx[0]; pv = idx[0]
            for j in idx[1:]:
                if j != pv + 1: runs.append((st_, pv)); st_ = j
                pv = j
            runs.append((st_, pv))
            if len(runs) > 1 and runs[0][0] == 0 and runs[-1][1] == len(c) - 1:
                runs[0] = (runs[-1][0] - len(c), runs[0][1]); runs.pop()
            a, b = max(runs, key=lambda t: t[1] - t[0])
            seg = np.array([c[j % len(c)] for j in range(a, b + 1)])
            if len(seg) > 20:
                seg = seg[4:-4]
                cen_ = seg.mean(0)
                nrm = hc - seg; nrm /= (np.hypot(nrm[:, 0], nrm[:, 1])[:, None] + 1e-9)
                seg = seg + nrm * 2.5
                seg = smooth_ring(seg, 3)[2:-2] if len(seg) > 8 else seg
                seg = m16.rdp(seg, 0.6)
                for x, y in seg:
                    xi, yi = int(np.clip(round(x), 0, Y1.shape[1] - 1)), int(np.clip(round(y), 0, Y1.shape[0] - 1))
                    w_ = float(np.clip(dtb[yi, xi], 0.8, 2.2))
                    hl.append([round(x + off[0], 1), round(y + off[1], 1), 1.6, round(float(np.clip(max(Y1[yi, xi], 0.3), 0, 0.6)), 2)])
    return dict(v=round(vband, 3), vg=round(vgap, 3), rings=[[round(float(v), 1) for v in r.ravel()] for r in rings],
                band=[[round(float(v), 1) for v in r.ravel()] for r in brings], cups=cups, hl=PL), cupm


def measure(f, fix=None, hpfix=None):
    d = OLD[str(f)]
    x0, y0, x1, y1 = d['box']; off = np.array([x0 - 6, y0 - 6], float)
    shape = (y1 - y0 + 12, x1 - x0 + 12)
    sl = (slice(int(off[1]), int(off[1]) + shape[0]), slice(int(off[0]), int(off[0]) + shape[1]))
    Y = m16.pre(f)[sl]
    Mo = room_model(f)[sl]
    Y1 = cv2.GaussianBlur(Y, (0, 0), 1.0)
    sil0 = (raster_rings(d['sil'], shape, off, 2) > 0.5).astype(np.uint8)
    ez = eye_mask(d, shape, off)
    res = dict(box=d['box'], S=d['S'], KL=d.get('KL', []), C=d.get('C', []), E=d.get('E', []))
    if d.get('O'): res['O'] = d['O']
    # dark regions of the old drawing: the first set of D levels (the < 0.64 regions)
    Dall = d.get('D', [])
    first = [it for it in Dall if 540 < it[0] < 620]
    dm = raster_rings(first[0][1:], shape, off) if first else np.zeros(shape, np.uint8)
    dm &= sil0
    fine = [it for it in Dall if it[0] > 620]         # the flying owl's feet (fine levels, flight 1148+)
    fz = np.zeros(shape, np.uint8)
    for it in fine: fz |= raster_rings(it[1:], shape, off)
    n, lab, st, cen = cv2.connectedComponentsWithStats(dm)
    hp = np.zeros(shape, np.uint8)
    if f not in SEAT and n > 1:
        big = 1 + int(np.argmax(st[1:, 4]))
        if st[big, 4] > 3000: hp = (lab == big).astype(np.uint8)
    # the silhouette: the old (closed) outline with the dark gaps that open onto the dark room carved out (the
    # notches between feathers, between toes): dark on the frame (sigma 0.8) where the room behind is dark too,
    # connected to the outside
    Y08 = cv2.GaussianBlur(Y, (0, 0), 0.8)
    fzd = cv2.dilate(fz, np.ones((9, 9), np.uint8)) > 0
    cand = (((Y08 < 0.3) | ((Y08 < 0.5) & fzd)) & (Mo < 0.25) & (cv2.dilate(hp, np.ones((5, 5), np.uint8)) == 0) & (cv2.dilate(ez, np.ones((5, 5), np.uint8)) == 0)).astype(np.uint8)
    outside = (sil0 == 0).astype(np.uint8)
    nc, lc, _, _ = cv2.connectedComponentsWithStats(cand | outside)
    keep = np.zeros_like(cand)
    ol = set(np.unique(lc[outside > 0]).tolist()) - {0}
    for i in ol: keep |= (lc == i).astype(np.uint8)
    carve = keep & cand & sil0
    # the lit room seen between the headphone band and the head (1143-1147, the owl in front of his face): where the
    # frame equals the room model there, it is the room (his hair, face), not the owl
    if hp.any():
        Y2_ = cv2.GaussianBlur(Y, (0, 0), 2.0); M2_ = cv2.GaussianBlur(Mo, (0, 0), 2.0)
        seen = ((np.abs(Y2_ - M2_) < 0.07) & (M2_ > 0.12) & (hp > 0)).astype(np.uint8)
        seen = cv2.morphologyEx(seen, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
        ns, ls, ss, _ = cv2.connectedComponentsWithStats(seen)
        for i in range(1, ns):
            if ss[i, 4] >= 60: carve |= (ls == i).astype(np.uint8); hp[ls == i] = 0
    if f in SEAT:
        carve[:] = 0          # its dark edge is the inked outline, not the room
        # the seated owl: the black gap enclosed between its headphone band and head is the dark room too
        enc = ((Y08 < 0.12) & (Mo < 0.25) & sil0 & (cv2.dilate(ez, np.ones((5, 5), np.uint8)) == 0)).astype(np.uint8)
        enc = cv2.morphologyEx(enc, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
        ne, le, se, _ = cv2.connectedComponentsWithStats(enc)
        for i in range(1, ne):
            if se[i, 4] >= 40: carve |= (le == i).astype(np.uint8)
    sil = (sil0 & (carve == 0)).astype(np.float32)
    sil = cv2.GaussianBlur(sil, (0, 0), 0.9)
    rings = m16.isolines(sil, 0.5, 0.45, 40, off)
    rings = [smooth_ring(r, 1) for r in rings]
    silm = (raster_rings(rings, shape, off, 2) > 0.5).astype(np.uint8)
    res['sil'] = [[round(float(v), 1) for v in r.ravel()] for r in rings]
    head_c = None
    if hp.any():
        if res['E']:
            head_c = [float(np.mean([e[1] for e in res['E']])), float(np.mean([e[2] for e in res['E']])) + 10]
        else:
            ys, xs = np.nonzero(skeletonize(hp > 0))
            A = np.stack([xs, ys, np.ones_like(xs)], 1).astype(float); b = -(xs ** 2 + ys ** 2).astype(float)
            cc = np.linalg.lstsq(A, b, rcond=None)[0]
            head_c = [float(-cc[0] / 2 + off[0]), float(-cc[1] / 2 + off[1])]
        res['HP'], cupm = headphones(hp, Y, Y1, silm, off, head_c)
        if hpfix is not None:
            # light matching of the headphones: an offset for the band, a gain per cup (owl3.py cal)
            res['HP']['v'] = round(float(np.clip(res['HP']['v'] + hpfix[0], 0, 0.6)), 3)
            for i, c in enumerate(res['HP']['cups']):
                k = float(hpfix[1 + i]) if 1 + i < len(hpfix) else 1.0
                for j in (7, 8, 9): c[j] = round(float(np.clip(c[j] * k, 0, 0.97)), 3)
    rest = dm & (hp == 0) & (ez == 0) & (carve == 0) & cv2.erode(silm, np.ones((5, 5), np.uint8))
    # dark bits touching the headphones (the band's shade on the head) are left to the ink lines
    nr, lr, sr, _ = cv2.connectedComponentsWithStats(rest)
    hpd = cv2.dilate(hp, np.ones((9, 9), np.uint8))
    for i in range(1, nr):
        if (hpd[lr == i] > 0).any(): rest[lr == i] = 0
    rest &= (cv2.dilate(fz, np.ones((5, 5), np.uint8)) == 0)
    res['N'] = [[v for p_ in s_ for v in p_] for s_ in comp_strokes(rest, Y1, silm, off)]
    # 1143-1147: the near wing over his lit face: its feather outlines measured afresh (the old lines there are broken)
    # and drawn as continuous dark lines (>= 1.5 px, <= 0.32)
    if f <= 1147:
        zw = (cv2.erode(silm, np.ones((7, 7), np.uint8)) & (cv2.GaussianBlur(Mo, (0, 0), 3) > 0.3) &
              (cv2.dilate(hp | ez, np.ones((9, 9), np.uint8)) == 0)).astype(np.uint8)
        def inw(s_):
            k_ = 4 * (len(s_) // 8); xi, yi = int(round(s_[k_] - off[0])), int(round(s_[k_ + 1] - off[1]))
            return 0 <= yi < shape[0] and 0 <= xi < shape[1] and zw[yi, xi] > 0
        Sw = m16.strokes(Y, 'dark', mask=zw, sigmas=(1.0, 1.5), hi=0.03, lo=0.012, dmin=0.04, minlen=12, eps=0.6,
                         smooth=5, win=13, off=off)
        res['S'] = [s_ for s_ in res['S'] if not inw(s_)] + [[v for p_ in s_ for v in (p_[0], p_[1], min(2.0, max(1.5, p_[2] * 0.7)), min(0.32, p_[3]))] for s_ in Sw]
    # the feet's thin parts (their fine levels in the old drawing): the toes' dark outlines as the medial axes of
    # their dark regions (the old 0.78 level), <= 2.4 px, >= 0.5 dark... drawn as tapered ink lines
    if f not in SEAT and fz.any():
        f78 = [it for it in fine if it[0] < 800]
        fm = np.zeros(shape, np.uint8)
        for it in f78[:1]: fm |= raster_rings(it[1:], shape, off)
        fm &= silm
        Sf = comp_strokes(fm, Y1, silm, off, minarea=6, extend=False)
        res['S'] = res['S'] + [[v for p_ in s_ for v in (p_[0], p_[1], min(2.4, p_[2]), min(0.5, p_[3]))] for s_ in Sf]
    # the seated owl (1162, 1163, 1175): its graphic parts (headphones, far wing, feet, tuft) were fine cel levels; now
    # their ink lines are measured there as centre-lines (the s12 method; the seated drawing is crisp) and the few
    # flat dark parts are authored in owl.js (SEAT: the cushion with its ribs, the band's shaded underside)
    if f in SEAT:
        dz = SEAT_OFF[f]
        zone = np.zeros(shape, np.uint8)
        for P_ in SEAT_ZONES:
            cv2.fillPoly(zone, [np.round(np.array(P_, float) + [dz[0] - off[0], dz[1] - off[1]]).astype(np.int32)], 1)
        zone &= cv2.dilate(silm, np.ones((3, 3), np.uint8))
        zone &= (cv2.dilate(ez, np.ones((5, 5), np.uint8)) == 0)
        def inzs(s_):
            k_ = 4 * (len(s_) // 8); xi, yi = int(round(s_[k_] - off[0])), int(round(s_[k_ + 1] - off[1]))
            return 0 <= yi < shape[0] and 0 <= xi < shape[1] and zone[yi, xi] > 0
        Sz = m16.strokes(Y, 'dark', mask=zone, sigmas=(0.8, 1.2), hi=0.03, lo=0.012, dmin=0.04, minlen=5, eps=0.5,
                         smooth=3, win=9, off=off)
        res['S'] = [s_ for s_ in res['S'] if not inzs(s_)] + [[v for p_ in s_ for v in (p_[0], p_[1], min(3.0, max(0.8, p_[2] * 0.75)), p_[3])] for s_ in Sz]
        # the cup is authored whole in owl.js (shell, face, hub, cushion): no measured lines inside its shell
        cb = np.zeros(shape, np.uint8)
        cv2.ellipse(cb, ((384 + dz[0] - off[0], 709.5 + dz[1] - off[1]), (2 * 34, 2 * 39), -0.2 * 180 / np.pi), 1, -1)
        cv2.ellipse(cb, ((405 + dz[0] - off[0], 700 + dz[1] - off[1]), (2 * 28, 2 * 42), -0.35 * 180 / np.pi), 1, -1)
        def incup(s_):
            k_ = 4 * (len(s_) // 8); xi, yi = int(round(s_[k_] - off[0])), int(round(s_[k_ + 1] - off[1]))
            return 0 <= yi < shape[0] and 0 <= xi < shape[1] and cb[yi, xi] > 0
        res['S'] = [s_ for s_ in res['S'] if not incup(s_)]
        res['SEAT'] = dict(d=list(dz))
        dm = dm | zone        # the parts are inpainted out of the value study (their light is drawn by the parts)
    # the plumage's light: the frame inside the silhouette with every dark feature narrower than ~9 px closed away
    # (lines, gaps, their soft edges), the dark parts drawn on top inpainted, blurred sigma 4 (normalised inside the
    # silhouette), then the coarse grid
    k9 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    ink = cv2.dilate(dm | hp | ez, np.ones((7, 7), np.uint8))
    Yi = cv2.inpaint(np.clip(Y, 0, 1).astype(np.float32), ink, 5, cv2.INPAINT_TELEA)
    Yi = cv2.morphologyEx(Yi, cv2.MORPH_CLOSE, k9)
    mc = cv2.erode(silm, np.ones((3, 3), np.uint8)).astype(np.float32)
    V = cv2.GaussianBlur(Yi * mc, (0, 0), 3) / np.maximum(1e-3, cv2.GaussianBlur(mc, (0, 0), 3))
    res['base'] = round(float(np.median(V[mc > 0])), 3)
    res['G'], g = coarse_grid(np.clip(V, 0, 1), silm, off, fix)
    res['_off'] = off; res['_shape'] = shape; res['_sil'] = silm
    return res


def js(r):
    o = {k: v for k, v in r.items() if not k.startswith('_')}
    return json.dumps(o, separators=(',', ':'))


if __name__ == '__main__':
    CAL = len(sys.argv) > 1 and sys.argv[1] == 'cal'
    FR = ALL if (len(sys.argv) <= 1 or CAL) else [int(v) for v in sys.argv[1].split(',')]
    FIXF = WORK + '/owl3_fix.npz'
    fix = dict(np.load(FIXF)) if os.path.exists(FIXF) else {}
    for f in FR:
        key = str(f)
        if f in SEAT and os.path.exists(f'{WORK}/owl3_seat_{f}.json'):
            pass
        r = measure(f, fix.get(key), fix.get(key + '_hp'))
        if CAL:
            raw = cv2.imread(f'{sys.argv[2]}/r{f}.png', 0).astype(np.float32) / 255
            gain = float(sys.argv[3]) if len(sys.argv) > 3 else 0.8
            off, shape, sil = r['_off'], r['_shape'], r['_sil']
            Y = m16.pre(f)[int(off[1]):int(off[1]) + shape[0], int(off[0]):int(off[0]) + shape[1]]
            R = raw[int(off[1]):int(off[1]) + shape[0], int(off[0]):int(off[0]) + shape[1]]
            mc = cv2.erode(sil, np.ones((5, 5), np.uint8)).astype(np.float32)
            nb = lambda X: cv2.GaussianBlur(X * mc, (0, 0), 6.0) / np.maximum(1e-3, cv2.GaussianBlur(mc, (0, 0), 6.0))
            dd = (nb(Y) - nb(R)) * (mc > 0)
            G = r['G']; h, w = shape
            P = np.pad(dd, ((0, G['ny'] * CELL - h), (0, G['nx'] * CELL - w)))
            Mp = np.pad(mc, ((0, G['ny'] * CELL - h), (0, G['nx'] * CELL - w)))
            gd = cv2.resize(P, (G['nx'], G['ny']), interpolation=cv2.INTER_AREA) / np.maximum(1e-3, cv2.resize(Mp, (G['nx'], G['ny']), interpolation=cv2.INTER_AREA))
            fix[key] = (fix.get(key, 0) + gain * gd).astype(np.float32)
            print(f, 'cal: mean |diff| inside %.4f  mean %.4f' % (np.abs(dd[mc > 0]).mean(), dd[mc > 0].mean()))
            if 'HP' in r:
                def rr(rings):
                    m = np.zeros(shape, np.uint8)
                    for q in rings:
                        pp = np.round((np.array(q).reshape(-1, 2) - off) * 16).astype(np.int32); t = np.zeros_like(m); cv2.fillPoly(t, [pp], 1, shift=4); m ^= t
                    return m
                hpm = rr(r['HP']['rings']); cm = np.zeros_like(hpm); ks = []
                for c in r['HP']['cups']:
                    m = np.zeros_like(hpm); cv2.ellipse(m, ((c[0] - off[0], c[1] - off[1]), (c[2] * 2, c[3] * 2), c[4]), 1, -1); m &= hpm; cm |= m
                    ks.append(float(np.clip(Y[m > 0].mean() / max(0.02, R[m > 0].mean()), 0.7, 1.4)) if m.any() else 1.0)
                b = (rr(r['HP']['band']) if r['HP'].get('band') else hpm) & (cv2.dilate(cm, np.ones((5, 5), np.uint8)) == 0)
                db = float(Y[b > 0].mean() - R[b > 0].mean()) if b.any() else 0.0
                old = fix.get(key + '_hp', np.array([0.0] + [1.0] * len(ks)))
                if len(old) != 1 + len(ks): old = np.array([0.0] + [1.0] * len(ks))
                fix[key + '_hp'] = np.array([old[0] + gain * db] + [old[1 + i] * (1 + gain * (ks[i] - 1)) for i in range(len(ks))], np.float32)
                print(f, 'hp: band %+.3f cups %s' % (db, ' '.join('%.2f' % k for k in ks)))
            r = measure(f, fix[key], fix.get(key + '_hp'))
        open(f'{WORK}/owl3_{f}.json', 'w').write(js(r))
        print(f, 'N', len(r['N']), 'HP', ('cups %d hl %d' % (len(r['HP']['cups']), len(r['HP']['hl']))) if 'HP' in r else '-', 'G levels', r['G']['lv'], flush=True)
    if CAL: np.savez(FIXF, **fix)
    if all(os.path.exists(f'{WORK}/owl3_{f}.json') for f in ALL):
        with open(OUT, 'w') as fo:
            fo.write('// s16 owl drawings (src/shots/s16/trace/owl3.py; geometry and a few measured values only). One drawing per source\n')
            fo.write('// frame where the drawing changes: frame px for the flight (1143-1163), plate px for the seated owl (1175, drawn\n')
            fo.write('// 1165.. under the room camera). sil = silhouette; G = coarse value study (8 px grid, <= 8 levels, q = level index\n')
            fo.write('// per cell, row-major); HP = headphones {v, rings, cups: [cx, cy, a, b, deg, ux, uy, vpad, vface, vhi], hl: edge line};\n')
            fo.write('// N = small dark parts as ink strokes; S = ink lines; KL = light shapes; C = cable; E = eyes; O = outline.\n')
            fo.write('export const OWL = {\n' + ',\n'.join('%d: %s' % (f, open(f'{WORK}/owl3_{f}.json').read()) for f in ALL) + '};\n')
        print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB')
