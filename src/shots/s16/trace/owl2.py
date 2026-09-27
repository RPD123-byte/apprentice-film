#!/usr/bin/env python3
# s16 owl, second measurement (this pass; replaces owl.py's output): cleaner parts for the same drawings.
# Changes against owl.py: the ink shapes K are only the solid dark parts (< 0.26 on a sigma-1 blur, opened, no
# specks), the grey "K2" shapes are gone (they read as camouflage blotches in the headphone cups); the soft shading L
# has 20 levels from 0.1 (the cups' greys are in it) measured at sigma 3; the ink lines take a second, finer scale.
# The outline stroke is dropped in owl.js (the source's edge is lit to the silhouette).
#
# (owl.py's header follows)
# s16 owl: one drawing per source frame where the owl's drawing changes (the s12/s13 method), measured in FRAME px
# (the flying owl, 1143–1164) or plate px (the seated owl, drawn from 1175 for 1165–1192 under the room's camera):
#   sil     the owl's silhouette: where the frame differs from the room plate (moved by that frame's camera), closed,
#           holes filled, simplified to 0.8 px
#   L       soft shading: outlines of the light inside the silhouette on the frame with its ink inpainted away, blurred
#           at sigma 3.5 (normalised inside the silhouette), 13 levels
#   K       ink shapes: the solid dark parts (pupils, eye rings, headphone cushions, beak, talons): outlines at one
#           threshold with their value
#   S       dark ink lines: centre-lines (Hessian ridge, hysteresis, skeleton, re-joined), width at half the peak
# Output: data/owl.js (geometry only). Usage: python3 owl.py [frames]
import sys, os, re, json
sys.path.insert(0, os.path.dirname(__file__))
import m16, cv2, numpy as np
from scipy import ndimage as ndi

OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'owl.js')
KTH = float(os.environ.get('KTH', 0.26))
WORK = m16.ROOT + '/snapshots/s16-h1-work'
M = m16.M; W, H = m16.W, m16.H
E = m16.plateE()
E[M + 698:M + 720, M + 700:M + 900] = m16.pre(1175)[698:720, 700:900]     # the mug's rim (see room.py)
cams = {}
for m in re.finditer(r'(\d+): \[([^\]]+)\]', open(os.path.join(os.path.dirname(__file__), '..', 'data', 'cams.js')).read()):
    cams[int(m.group(1))] = [float(v) for v in m.group(2).split(',')]
OPEN = {'L': [[1283, 215], [1290, 211], [1300, 208], [1310, 206.5], [1320, 205.5], [1330, 205.5], [1340, 206], [1348, 207.5], [1354, 210], [1358, 213],
              [1361, 216], [1356, 221], [1348, 225], [1340, 227.5], [1330, 228.5], [1320, 229], [1310, 229], [1300, 227.5], [1292, 224], [1286, 219.5]],
        'R': [[1459, 213], [1464, 209], [1472, 206], [1480, 204], [1490, 203], [1500, 203], [1510, 203.5], [1518, 205], [1524, 207.5], [1529, 211],
              [1531, 213], [1526, 217], [1520, 221], [1510, 224.5], [1500, 225.5], [1490, 225.5], [1480, 224], [1470, 221], [1463, 217]]}
def _steam():
    t = open(os.path.join(os.path.dirname(__file__), '..', 'data', 'steam.js')).read()
    dr = t.split('export const DRAWINGS = [')[1].split('];\nexport const FRAME')[0]
    D = json.loads('[' + dr + ']')
    fr = json.loads(re.sub(r'(\d+):', r'"\1":', t.split('export const FRAME = ')[1].split(';')[0]))
    return [[np.array(s).reshape(-1, 4).tolist() for s in S] for S in D], {int(k): v for k, v in fr.items()}
STEAM_DR, STEAM_FR = _steam()
SLIDE = {1154: [1332, 1502], 1155: [1319, 1487], 1156: [1309, 1480], 1157: [1303, 1474], 1158: [1301, 1472], 1159: [1300, 1471]}


def model(f):
    """the room as the film draws it under the owl: the plate with the irises of frame f, moved by the camera"""
    P = E[M:M + H, M:M + W].copy()
    x = [1336, 1506] if f <= 1153 else [1296, 1466] if f >= 1160 else SLIDE[f]
    for i, k in enumerate('LR'):
        op = np.zeros((H, W), np.uint8); cv2.fillPoly(op, [np.round(np.array(OPEN[k]) * 4).astype(np.int32)], 1, shift=2)
        el = np.zeros((H, W), np.uint8); cv2.ellipse(el, (int(x[i]), 219 if i == 0 else 216), (13, 17), 0, 0, 360, 1, -1)
        P[(op > 0) & (el > 0)] = 0.14
    # the steam of that frame (data/steam.js, plate px), as the film draws it
    sd = STEAM_DR[STEAM_FR[f]] if f in STEAM_FR else []
    if sd:
        cp, vp = m16.stroke_raster(sd, P.shape, True, (0, 0))
        P = np.where(cp > 0.25, np.maximum(P, vp / np.maximum(cp, 1e-3)), P)
    Pe = E.copy(); Pe[M:M + H, M:M + W] = P
    a, b, tx, c, d, ty = cams.get(f, [1, 0, 0, 0, 1, 0])
    # plate px -> frame px (the plate canvas's origin is (-M, -M))
    A = np.array([[a, b, tx - (a + b) * M], [c, d, ty - (c + d) * M]], np.float32)
    return cv2.warpAffine(Pe, A, (W, H), flags=cv2.INTER_LINEAR)


def owl_mask(f, Y, Mo, box):
    Yb = cv2.GaussianBlur(Y, (0, 0), 1.5); Mb = cv2.GaussianBlur(Mo, (0, 0), 1.5)
    d = np.full(Y.shape, 9.0, np.float32)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            d = np.minimum(d, np.abs(Yb - np.roll(np.roll(Mb, dy, 0), dx, 1)))
    x0, y0, x1, y1 = box
    m = np.zeros(Y.shape, np.uint8); m[y0:y1, x0:x1] = (d[y0:y1, x0:x1] > 0.1)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
    m = ndi.binary_fill_holes(m).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n <= 1: return m
    big = 1 + int(np.argmax(st[1:, 4]))
    keep = np.zeros_like(m)
    for i in range(1, n):
        if i == big or st[i, 4] > 0.03 * st[big, 4]: keep[lab == i] = 1
    return keep


def light_shapes(Yc, inner, o):
    """small bright parts enclosed by dark ink (eye whites, highlights in the headphones): outlines with their value;
    never at the silhouette's edge (the background there is dark too)"""
    Yl = cv2.GaussianBlur(Yc, (0, 0), 0.7)
    deep = cv2.erode(inner, np.ones((13, 13), np.uint8))
    lm = ((Yl > 0.78) & (inner > 0)).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(lm)
    out = []
    for i in range(1, n):
        if st[i, 4] < 10 or st[i, 4] > 2500: continue
        comp = (lab == i).astype(np.uint8)
        if (comp & (deep == 0)).any(): continue
        ring = cv2.dilate(comp, np.ones((5, 5), np.uint8)) - comp
        if Yl[ring > 0].mean() > 0.5: continue           # not enclosed by ink: part of the lit plumage
        for r in m16.isolines(cv2.GaussianBlur(comp.astype(np.float32), (0, 0), 0.6), 0.5, 0.6, 8, o):
            out.append((float(Yc[comp > 0].mean()), r))
    return out


def shapes_raster(K, shape, o):
    kc = np.zeros(shape, np.float32); kv = np.zeros(shape, np.float32)
    for v, r in K:
        mm = np.zeros((shape[0] * 4, shape[1] * 4), np.uint8); cv2.fillPoly(mm, [np.round((r - o) * 16).astype(np.int32)], 1, shift=2)
        a = cv2.resize(mm.astype(np.float32), (shape[1], shape[0]), interpolation=cv2.INTER_AREA)
        kv = kv * (1 - a) + a * v; kc = kc + a * (1 - kc)
    return kc, kv


EYES = {}
_ef = m16.ROOT + '/snapshots/s16-h1-work/eyes_fit.json'
if os.path.exists(_ef):
    EYES = {int(k): v for k, v in json.load(open(_ef)).items()}
DTH = [0.64, 0.56, 0.48, 0.40, 0.32, 0.24, 0.16, 0.08]      # dark cel levels (wide dark parts), light -> dark
# the seated owl (1162, 1163, 1175): the dark cel levels only on its near headphone cup (an ellipse read off a 2x grid
# of 1175, moved by the cup's template-matched offset); the rest of it is soft shading + ink lines + the eyes.
# Its shading is measured smoother (sigma 6): the source's plumage there is an even, bright fluff.
SEAT = {1175: (0, 0), 1163: (1, -3), 1162: (3, -1)}
SEAT_CUP = ((392, 706), (104, 104), 0)
# the seated owl's graphic parts, drawn as fine cel levels (sigma 0.9, 11 levels; the s13 method): the headphones
# (cup, yoke, slider and band) and the two feet. Outlines read off 2x / 4x grids of 1175 (frame px).
SEAT_ZONES = [[(345, 700), (345, 640), (355, 605), (375, 580), (410, 560), (450, 553), (490, 563), (508, 585), (497, 602), (470, 592),
               (440, 588), (410, 598), (392, 616), (388, 650), (422, 663), (442, 700), (438, 746), (410, 762), (368, 760), (348, 742)],
              [(585, 815), (650, 815), (655, 912), (585, 912)], [(668, 785), (722, 785), (722, 878), (668, 878)],
              [(572, 640), (590, 604), (640, 598), (692, 636), (708, 700), (702, 748), (660, 752), (620, 722), (592, 692), (578, 672)],
              [(278, 634), (342, 622), (348, 682), (300, 692)]]
FTH = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42, 0.34, 0.26, 0.18, 0.1]


def eye_zone(f, shape, o, grow=3.0):
    """mask of the authored eyes (sclera ellipse, grown) in crop px"""
    z = np.zeros(shape, np.uint8)
    for e in EYES.get(f, []):
        s = e['sclera'] or [e['iris'][0], e['iris'][1], e['iris'][2] * 1.55, e['iris'][3] * 1.5, e['iris'][4]]
        cv2.ellipse(z, ((float(s[0] - o[0]), float(s[1] - o[1])), (float(s[2] + 2 * grow), float(s[3] + 2 * grow)), float(s[4])), 1, -1)
    return z


def measure(f, Y, mask, diff=None, off=(0, 0), vt_fix=None):
    ys, xs = np.nonzero(mask)
    x0, y0, x1, y1 = max(0, xs.min() - 8), max(0, ys.min() - 8), min(Y.shape[1], xs.max() + 9), min(Y.shape[0], ys.max() + 9)
    Yc = Y[y0:y1, x0:x1]; mc0 = mask[y0:y1, x0:x1].astype(np.float32)
    o = (x0 + off[0], y0 + off[1])
    msm = cv2.GaussianBlur(mc0, (0, 0), 2.0)
    mc = (msm > 0.77).astype(np.float32)
    mcu = mc.astype(np.uint8)
    sil = m16.isolines(msm, 0.77, 0.8, 30, o)
    inner = cv2.dilate(mcu, np.ones((5, 5), np.uint8))
    ez = eye_zone(f - (0 if f in EYES else 0), Yc.shape, o) if f in EYES else np.zeros(Yc.shape, np.uint8)
    # ---- dark cel levels: the WIDE dark parts (headphone band and cups, pupils, eye rings of the seated owl, beak
    # shading, talons' shadows): sigma-1.2 blur, opened with a 5 px disc (thin lines are left to the line tracer)
    Y1 = cv2.GaussianBlur(Yc, (0, 0), 1.2)
    wide = ((Y1 < DTH[0]) & (cv2.erode(mcu, np.ones((3, 3), np.uint8)) > 0)).astype(np.uint8)
    wide = cv2.morphologyEx(wide, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    wide &= (ez == 0)
    if f in SEAT:
        cz = np.zeros(Yc.shape, np.uint8); (cx_, cy_), axs, an = SEAT_CUP; d_ = SEAT[f]
        cv2.ellipse(cz, ((float(cx_ + d_[0] - o[0]), float(cy_ + d_[1] - o[1])), (float(axs[0]), float(axs[1])), float(an)), 1, -1)
        wide &= (cz | (Y1 < 0.3)).astype(np.uint8)
    nk, lk, sk_, _ = cv2.connectedComponentsWithStats(wide)
    for i in range(1, nk):
        if sk_[i, 4] < 30: wide[lk == i] = 0
    wide = cv2.dilate(wide, np.ones((3, 3), np.uint8)) & mcu & (ez == 0)
    zone = np.zeros(Yc.shape, np.uint8)
    if f in SEAT:
        d_ = SEAT[f]
        for P_ in SEAT_ZONES:
            cv2.fillPoly(zone, [np.round(np.array(P_, float) + [d_[0] - o[0], d_[1] - o[1]]).astype(np.int32)], 1)
        zone &= mcu
        wide &= (zone == 0)
    elif f >= 1148 and f in EYES:
        # the flying owl's feet: the thin parts of its silhouette (what a 25 px disc opening removes) below its eyes
        # + 60 px, grown a little; drawn as the same fine cel levels
        thin = mcu - cv2.morphologyEx(mcu, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
        ey = max(e['iris'][1] for e in EYES[f]) - o[1] + 60
        thin[:max(0, int(ey))] = 0
        nk2, lk2, sk2, _ = cv2.connectedComponentsWithStats(thin)
        for i in range(1, nk2):
            if sk2[i, 4] >= 60: zone[lk2 == i] = 1
        zone = cv2.dilate(zone, np.ones((7, 7), np.uint8)) & mcu
        wide &= (zone == 0)
    D = []
    img = np.where(wide > 0, Y1, 1.0).astype(np.float32)
    ts = DTH + [-1.0]
    for k in range(len(DTH)):
        band = (img < ts[k]) & (img >= ts[k + 1])
        if band.sum() < 6: continue
        v = float(img[band].mean())
        rings = m16.isolines(cv2.GaussianBlur((img < ts[k]).astype(np.float32), (0, 0), 0.7), 0.5, 0.6, 10, o)
        if rings: D.append((v, rings))
    if zone.any():
        Y09 = cv2.GaussianBlur(Yc, (0, 0), 0.9)
        zimg = np.where(zone > 0, Y09, 2.0).astype(np.float32)
        zs = FTH + [-1.0]
        for k in range(len(FTH)):
            band = (zimg < zs[k]) & (zimg >= zs[k + 1])
            if band.sum() < 4: continue
            rings = m16.isolines(cv2.GaussianBlur((zimg < zs[k]).astype(np.float32), (0, 0), 0.5), 0.5, 0.45, 5, o)
            if rings: D.append((float(zimg[band].mean()), rings))
    # ---- ink lines (thin), away from the wide dark parts and the authored eyes
    smask = (inner > 0) & (cv2.dilate(wide | zone, np.ones((3, 3), np.uint8)) == 0) & (cv2.dilate(ez, np.ones((3, 3), np.uint8)) == 0)
    smask &= cv2.erode(mcu, np.ones((5, 5), np.uint8)) > 0
    S = m16.strokes(Yc, 'dark', mask=smask.astype(np.uint8), sigmas=(0.9, 1.3), hi=float(os.environ.get('OHI', 0.035)), lo=float(os.environ.get('OLO', 0.016)),
                    dmin=0.05, minlen=7, eps=0.6, smooth=5, win=11, off=o)
    for s_ in S:
        for p in s_: p[2] = round(max(0.6, p[2] * 0.8), 1)
    KL = [(v, r) for v, r in light_shapes(Yc, inner, o) if not ez[int(np.clip(r[:, 1].mean() - o[1], 0, ez.shape[0] - 1)), int(np.clip(r[:, 0].mean() - o[0], 0, ez.shape[1] - 1))]]
    C = []
    if diff is not None and f <= 1163:
        dz = ((diff[y0:y1, x0:x1] > 0.06) & (cv2.dilate(mcu, np.ones((9, 9), np.uint8)) == 0)).astype(np.uint8)
        dz = cv2.dilate(dz, np.ones((5, 5), np.uint8)) & (cv2.dilate(mcu, np.ones((7, 7), np.uint8)) == 0)
        C = m16.strokes(Yc, 'pale', mask=dz.astype(np.uint8), sigmas=(0.8, 1.3), hi=0.05, lo=0.025, dmin=0.08, minlen=25, eps=0.6, smooth=5, win=9, off=o)
        C = [c for c in C if np.mean([p[3] for p in c]) > 0.3]
    # ---- soft shading, measured between everything drawn on top
    SIG = float(os.environ.get('OSIG', 6.0 if f in SEAT else 3.0))
    nb = lambda X: cv2.GaussianBlur(X * mc, (0, 0), SIG) / np.maximum(1e-3, cv2.GaussianBlur(mc, (0, 0), SIG))
    cd, vd = m16.stroke_raster(S, Yc.shape, False, o)
    lc, lv = shapes_raster(KL, Yc.shape, o)
    ink = cv2.dilate(((cd > 0.15) | (lc > 0.15) | (ez > 0)).astype(np.uint8), np.ones((3, 3), np.uint8))
    ink |= cv2.dilate(wide | zone, np.ones((7, 7), np.uint8))
    ink |= mcu - cv2.erode(mcu, np.ones((7, 7), np.uint8))
    Yi = cv2.inpaint(np.clip(Yc, 0, 1).astype(np.float32), ink, 4, cv2.INPAINT_TELEA)
    if f not in SEAT:
        k7 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        Yi = np.where(mcu > 0, cv2.morphologyEx(Yi, cv2.MORPH_CLOSE, k7), Yi).astype(np.float32)
    if f in SEAT:
        # the seated owl's plumage study: a grey closing (9 px) first takes out every dark feature narrower than
        # that (lines, gaps, their soft edges) so only the fluff's broad light is left
        k9 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
        Yi = np.where(mcu > 0, cv2.morphologyEx(Yi, cv2.MORPH_CLOSE, k9), Yi).astype(np.float32)
    Vt = np.clip(nb(Yi), 0, 1).astype(np.float32)
    if vt_fix is not None: Vt = np.clip(Vt + vt_fix, 0, 1).astype(np.float32)
    raw_vt = Vt.copy()
    ext = cv2.GaussianBlur(Vt * mc, (0, 0), 6) / np.maximum(1e-3, cv2.GaussianBlur(mc, (0, 0), 6))
    for _ in range(3):
        ext = np.where(mc > 0, Vt, ext)
        ext = cv2.GaussianBlur(ext, (0, 0), 4)
    Vt = np.where(mc > 0, Vt, ext).astype(np.float32)
    TH = [0.3, 0.4, 0.5, 0.56, 0.62, 0.67, 0.72, 0.76, 0.8, 0.83, 0.86, 0.885, 0.91, 0.93, 0.95, 0.965, 0.98]
    L, _ = m16.value_levels(Vt, 0.5, TH, eps=1.6, minarea=40, off=o)
    E = []
    for e in EYES.get(f, []):
        E.append([e.get('t', 0)] + [round(v, 1) for v in e['iris']] + [round(v, 1) for v in (e['sclera'] or [0, 0, 0, 0, 0])] + [round(v, 1) for v in (e['catch'] or [0, 0, 0])])
    # the seated owl's outline: the median of the darkest value 0-2 px inside its edge (the source inks it)
    O = None
    if f in SEAT:
        band = (mcu > 0) & (cv2.erode(mcu, np.ones((5, 5), np.uint8)) == 0) & (zone == 0)
        O = (float(np.clip(np.median(cv2.erode(Yc, np.ones((3, 3), np.uint8))[band]), 0.15, 0.7)), 2.4)
    return dict(box=[int(x0 + off[0]), int(y0 + off[1]), int(x1 + off[0]), int(y1 + off[1])], sil=sil, L=L, D=D, KL=KL, S=S, C=C, E=E, O=O,
                base=float(np.median(Vt[mc > 0])), _vt=raw_vt, _mc=mc)


def js(dw):
    head = '{box:%s,base:%.3f,' % (json.dumps(dw['box']), dw['base'])
    if dw.get('O'): head += 'O:[%.2f,%.1f],' % dw['O']
    return head + ('sil:[%s],\nL:[%s],\nD:[%s],\nKL:[%s],\nK:[],\nE:%s,\nS:[%s],\nC:[%s]}' % (
        m16.js_rings(dw['sil'], 1),
        ',\n'.join('[%d,%s]' % (round(v * 1000), m16.js_rings(r, 0)) for v, r in dw['L']),
        ',\n'.join('[%d,%s]' % (round(v * 1000), m16.js_rings(r, 1)) for v, r in dw['D']),
        ','.join('[%d,%s]' % (round(v * 1000), m16.js_rings([r], 1)) for v, r in dw['KL']),
        json.dumps(dw['E']), m16.js_strokes(dw['S']), m16.js_strokes(dw['C'])))


# frames with their own drawing (1146 repeats 1145, 1164 repeats 1163; 1165–1192 the seated owl of 1175)
# usage: owl.py [frames]        measure (and write data/owl.js when all frames are measured)
#        owl.py cal RAWDIR gain  light matching: move each drawing's shading by (source - raw render), blurred
ALL = [f for f in range(1143, 1164) if f != 1146] + [1175]
CAL = len(sys.argv) > 1 and sys.argv[1] == 'cal'
FR = ALL if (len(sys.argv) <= 1 or CAL) else [int(v) for v in sys.argv[1].split(',')]
BOX = lambda f: (700, 0, 1560, 700) if f <= 1147 else (300, 0, 1450, 800) if f <= 1150 else (0, 60, 1250, 946)
FIX = WORK + '/owl2_fix.npz'
fix = dict(np.load(FIX)) if os.path.exists(FIX) else {}
res = {}
dbg = []
for f in FR:
    Y = m16.pre(f)
    Mo = model(f)
    box = (60, 400, 800, 946) if f == 1175 else BOX(f)
    mask = owl_mask(f, Y, Mo, box)
    diff = np.abs(cv2.GaussianBlur(Y, (0, 0), 1.0) - cv2.GaussianBlur(Mo, (0, 0), 1.0))
    key = str(f)
    if CAL:
        raw = cv2.imread(f'{sys.argv[2]}/r{f}.png', 0).astype(np.float32) / 255
        gain = float(sys.argv[3]) if len(sys.argv) > 3 else 0.8
        dw0 = measure(f, Y, mask, diff, vt_fix=fix.get(key))
        x0, y0, x1, y1 = dw0['box']; mc = dw0['_mc']
        nb = lambda X: cv2.GaussianBlur(X * mc, (0, 0), 5.0) / np.maximum(1e-3, cv2.GaussianBlur(mc, (0, 0), 5.0))
        d = (nb(Y[y0:y1, x0:x1]) - nb(raw[y0:y1, x0:x1])) * (cv2.erode(mc, np.ones((5, 5), np.uint8)) > 0)
        fix[key] = (fix.get(key, 0) + gain * d).astype(np.float32)
        print(f, 'cal: mean |diff| inside %.4f' % np.abs(d[mc > 0]).mean())
    dw = measure(f, Y, mask, diff, vt_fix=fix.get(key))
    res[f] = dw
    open(f'{WORK}/owl2_{f}.js', 'w').write(js(dw))       # per-drawing cache: owl.js is assembled from all of them
    print(f, 'box', dw['box'], 'sil', len(dw['sil']), 'L', sum(len(r) for _, r in dw['L']), 'D', sum(len(r) for _, r in dw['D']), 'KL', len(dw['KL']), 'S', len(dw['S']), 'C', len(dw['C']), 'E', len(dw['E']), flush=True)
    t = cv2.cvtColor((np.clip(Y, 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(t, cs, -1, (0, 0, 255), 2)
    x0, y0, x1, y1 = dw['box']
    tt = cv2.resize(t[y0:y1, x0:x1], (330, int(330 * (y1 - y0) / max(1, x1 - x0))))[:300]
    tt = cv2.copyMakeBorder(tt, 0, 300 - tt.shape[0], 0, 0, cv2.BORDER_CONSTANT); cv2.putText(tt, str(f), (4, 18), 0, 0.6, (0, 255, 255), 2)
    dbg.append(tt)
if CAL: np.savez(FIX, **fix)
while len(dbg) % 6: dbg.append(np.zeros_like(dbg[0]))
cv2.imwrite(WORK + '/owl2_masks.jpg', np.vstack([np.hstack(dbg[i:i + 6]) for i in range(0, len(dbg), 6)]))
if all(os.path.exists(f'{WORK}/owl2_{f}.js') for f in ALL):
    with open(OUT, 'w') as fo:
        fo.write('// s16 owl drawings, measured by src/shots/s16/trace/owl.py (geometry only). One drawing per source frame where\n')
        fo.write('// the drawing changes: frame px for the flight (1143–1163), plate px for the seated owl (1175, drawn 1165.. under\n')
        fo.write('// the room camera). sil = silhouette rings; L = soft shading [value*1000, rings]; KL = light shapes (eye whites);\n')
        fo.write('// K = ink shapes; S = ink lines; C = pale lines outside the silhouette (the headphone cable).\n')
        fo.write('export const OWL = {\n' + ',\n'.join('%d: %s' % (f, open(f'{WORK}/owl2_{f}.js').read()) for f in ALL) + '};\n')
    print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB')
