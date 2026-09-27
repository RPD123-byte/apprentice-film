#!/usr/bin/env python3
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


def measure(f, Y, mask, diff=None, off=(0, 0), vt_fix=None):
    ys, xs = np.nonzero(mask)
    x0, y0, x1, y1 = max(0, xs.min() - 8), max(0, ys.min() - 8), min(Y.shape[1], xs.max() + 9), min(Y.shape[0], ys.max() + 9)
    Yc = Y[y0:y1, x0:x1]; mc0 = mask[y0:y1, x0:x1].astype(np.float32)
    o = (x0 + off[0], y0 + off[1])
    # the difference mask runs ~1.8 px outside the owl's edge (sigma-1.5 blur, threshold 0.1): pull it in by 1.5 px
    # (the 0.77 level of the mask blurred at sigma 2)
    msm = cv2.GaussianBlur(mc0, (0, 0), 2.0)
    mc = (msm > 0.77).astype(np.float32)
    sil = m16.isolines(msm, 0.77, 0.8, 30, o)
    inner = cv2.dilate(mc.astype(np.uint8), np.ones((5, 5), np.uint8))
    # ink shapes: solid dark parts; light shapes: small bright parts enclosed by ink
    Yk = cv2.GaussianBlur(Yc, (0, 0), 0.8)
    kmask = ((Yk < 0.3) & (cv2.erode(mc.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)).astype(np.uint8)
    # solid only: thin dark lines are left to the line tracer
    kmask = cv2.morphologyEx(kmask, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (4, 4))).astype(np.float32)
    # ink lines, away from the solid shapes (a line tracer run over a solid blob follows its inside edge)
    smask = (inner > 0) & (cv2.dilate(kmask.astype(np.uint8), np.ones((5, 5), np.uint8)) == 0)
    # (and off the silhouette's edge: the outline is drawn along the silhouette itself)
    smask &= cv2.erode(mc.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    S = m16.strokes(Yc, 'dark', mask=smask.astype(np.uint8), sigmas=(0.9,), hi=float(os.environ.get('OHI', 0.035)), lo=float(os.environ.get('OLO', 0.018)),
                    dmin=0.05, minlen=7, eps=0.6, smooth=5, win=11, off=o)
    # the outline: the darkest value across the silhouette's inner edge band (median round the silhouette)
    band = (mc > 0) & (cv2.erode(mc.astype(np.uint8), np.ones((5, 5), np.uint8)) == 0)   # 2 px inside the edge
    edge_v = float(np.median(cv2.erode(Yc, np.ones((3, 3), np.uint8))[band])) if band.any() else 0.5
    for s_ in S:
        for p in s_: p[2] = round(max(0.6, p[2] * 0.8), 1)
    K = []
    for r in m16.isolines(cv2.GaussianBlur(kmask, (0, 0), 0.7), 0.5, 0.7, 8, o):
        mm = np.zeros(Yc.shape, np.uint8); cv2.fillPoly(mm, [np.round((r - o) * 4).astype(np.int32)], 1, shift=2)
        K.append((float(Yc[mm > 0].mean()) if mm.sum() else 0.1, r))
    KL = light_shapes(Yc, inner, o)
    # grey ink shapes (headphone band shadows, cushions, eye rings' shade): solid mid-dark parts, drawn under K
    k2 = ((Yk >= 0.3) & (Yk < 0.58) & (cv2.erode(mc.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0)).astype(np.uint8)
    k2 = cv2.morphologyEx(k2, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    K2 = []
    for r in m16.isolines(cv2.GaussianBlur(k2.astype(np.float32), (0, 0), 0.7), 0.5, 0.7, 14, o):
        mm = np.zeros(Yc.shape, np.uint8); cv2.fillPoly(mm, [np.round((r - o) * 4).astype(np.int32)], 1, shift=2)
        if mm.sum(): K2.append((float(Yc[mm > 0].mean()), r))
    K = K2 + K
    # the headphone cable and other thin pale lines just outside the silhouette (where the frame differs from the room)
    C = []
    if diff is not None and f <= 1163:
        dz = ((diff[y0:y1, x0:x1] > 0.06) & (cv2.dilate(mc.astype(np.uint8), np.ones((9, 9), np.uint8)) == 0)).astype(np.uint8)
        dz = cv2.dilate(dz, np.ones((5, 5), np.uint8)) & (cv2.dilate(mc.astype(np.uint8), np.ones((7, 7), np.uint8)) == 0)
        C = m16.strokes(Yc, 'pale', mask=dz.astype(np.uint8), sigmas=(0.8, 1.3), hi=0.05, lo=0.025, dmin=0.08, minlen=25, eps=0.6, smooth=5, win=9, off=o)
        C = [c for c in C if np.mean([p[3] for p in c]) > 0.3]
    # soft shading: normalised blur inside the silhouette, corrected for the ink on top
    SIG = float(os.environ.get('OSIG', 3.5))
    nb = lambda X: cv2.GaussianBlur(X * mc, (0, 0), SIG) / np.maximum(1e-3, cv2.GaussianBlur(mc, (0, 0), SIG))
    # the shading is measured BETWEEN the ink: everything drawn on top (light shapes, ink shapes, ink lines) is
    # inpainted away first, so the soft shading has no dark halo round the eyes and lines
    cd, vd = m16.stroke_raster(S, Yc.shape, False, o)
    lc, lv = shapes_raster(KL, Yc.shape, o)
    kc, kv = shapes_raster(K, Yc.shape, o)
    ink = cv2.dilate(((cd > 0.15) | (kc > 0.15) | (lc > 0.15)).astype(np.uint8), np.ones((3, 3), np.uint8))
    ink |= (mc > 0).astype(np.uint8) - cv2.erode((mc > 0).astype(np.uint8), np.ones((7, 7), np.uint8))   # the outline band
    Yi = cv2.inpaint(np.clip(Yc, 0, 1).astype(np.float32), ink, 4, cv2.INPAINT_TELEA)
    Vt = np.clip(nb(Yi), 0, 1).astype(np.float32)
    if vt_fix is not None: Vt = np.clip(Vt + vt_fix, 0, 1).astype(np.float32)
    raw_vt = Vt.copy()
    # outside the silhouette carry the nearest inside value (the drawing is clipped to the silhouette), so the level
    # outlines do not all run round the silhouette
    ext = cv2.GaussianBlur(Vt * mc, (0, 0), 6) / np.maximum(1e-3, cv2.GaussianBlur(mc, (0, 0), 6))
    for _ in range(3):
        ext = np.where(mc > 0, Vt, ext)
        ext = cv2.GaussianBlur(ext, (0, 0), 4)
    Vt = np.where(mc > 0, Vt, ext).astype(np.float32)
    TH = [0.3, 0.42, 0.52, 0.6, 0.67, 0.73, 0.78, 0.82, 0.86, 0.89, 0.92, 0.95, 0.975]
    L, _ = m16.value_levels(Vt, 0.5, TH, eps=1.6, minarea=40, off=o)
    return dict(box=[int(x0 + off[0]), int(y0 + off[1]), int(x1 + off[0]), int(y1 + off[1])], sil=sil, L=L, K=K, KL=KL, S=S, C=C, edge=edge_v,
                base=float(np.median(Vt[mc > 0])), _vt=raw_vt, _mc=mc)


def js(dw):
    return ('{box:%s,base:%.3f,edge:%.3f,sil:[%s],\nL:[%s],\nKL:[%s],\nK:[%s],\nS:[%s],\nC:[%s]}' % (
        json.dumps(dw['box']), dw['base'], dw['edge'], m16.js_rings(dw['sil'], 1),
        ',\n'.join('[%d,%s]' % (round(v * 1000), m16.js_rings(r, 0)) for v, r in dw['L']),
        ','.join('[%d,%s]' % (round(v * 1000), m16.js_rings([r], 1)) for v, r in dw['KL']),
        ','.join('[%d,%s]' % (round(v * 1000), m16.js_rings([r], 1)) for v, r in dw['K']),
        m16.js_strokes(dw['S']), m16.js_strokes(dw['C'])))


# frames with their own drawing (1146 repeats 1145, 1164 repeats 1163; 1165–1192 the seated owl of 1175)
# usage: owl.py [frames]        measure (and write data/owl.js when all frames are measured)
#        owl.py cal RAWDIR gain  light matching: move each drawing's shading by (source - raw render), blurred
ALL = [f for f in range(1143, 1164) if f != 1146] + [1175]
CAL = len(sys.argv) > 1 and sys.argv[1] == 'cal'
FR = ALL if (len(sys.argv) <= 1 or CAL) else [int(v) for v in sys.argv[1].split(',')]
BOX = lambda f: (700, 0, 1560, 700) if f <= 1147 else (300, 0, 1450, 800) if f <= 1150 else (0, 60, 1250, 946)
FIX = WORK + '/owl_fix.npz'
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
    print(f, 'box', dw['box'], 'sil', len(dw['sil']), 'L', sum(len(r) for _, r in dw['L']), 'K', len(dw['K']), 'KL', len(dw['KL']), 'S', len(dw['S']), 'C', len(dw['C']), flush=True)
    t = cv2.cvtColor((np.clip(Y, 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(t, cs, -1, (0, 0, 255), 2)
    x0, y0, x1, y1 = dw['box']
    tt = cv2.resize(t[y0:y1, x0:x1], (330, int(330 * (y1 - y0) / max(1, x1 - x0))))[:300]
    tt = cv2.copyMakeBorder(tt, 0, 300 - tt.shape[0], 0, 0, cv2.BORDER_CONSTANT); cv2.putText(tt, str(f), (4, 18), 0, 0.6, (0, 255, 255), 2)
    dbg.append(tt)
if CAL: np.savez(FIX, **fix)
while len(dbg) % 6: dbg.append(np.zeros_like(dbg[0]))
cv2.imwrite(WORK + '/owl_masks.jpg', np.vstack([np.hstack(dbg[i:i + 6]) for i in range(0, len(dbg), 6)]))
if FR == ALL:
    with open(OUT, 'w') as fo:
        fo.write('// s16 owl drawings, measured by src/shots/s16/trace/owl.py (geometry only). One drawing per source frame where\n')
        fo.write('// the drawing changes: frame px for the flight (1143–1163), plate px for the seated owl (1175, drawn 1165.. under\n')
        fo.write('// the room camera). sil = silhouette rings; L = soft shading [value*1000, rings]; KL = light shapes (eye whites);\n')
        fo.write('// K = ink shapes; S = ink lines; C = pale lines outside the silhouette (the headphone cable).\n')
        fo.write('export const OWL = {\n' + ',\n'.join('%d: %s' % (f, js(dw)) for f, dw in res.items()) + '};\n')
    print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB')
