#!/usr/bin/env python3
# calib.py cel.json render.png ref.png out.json [over.json ...] [ex=cx,cy,rx,ry ...]
# (over: traces painted later on top — their regions are left out; ex: ellipses of other parts drawn on top, e.g. eyes)
# Tone calibration of cel traces (as fit_tone.py does for the plumage): for every group of every level, the pixels
# where that group is the topmost paint (rasterised here from the rings, eroded 1 px) are compared in the render
# (after the global grade) and in the reference drawing; the median difference is taken back through the grade's
# local slope (S-curve x vignette x halation) and added to the group's value. Small groups use their level's median.
# Writes the adjusted trace (values only change). No pixels are stored.
import cv2, numpy as np, json, sys
cp, rp, sp, op = sys.argv[1:5]
OVER = [json.load(open(a)) for a in sys.argv[5:] if not a.startswith('ex=')]
EXE = [[float(v) for v in a[3:].split(',')] for a in sys.argv[5:] if a.startswith('ex=')]
d = json.load(open(cp)); r = cv2.GaussianBlur(cv2.imread(rp, 0).astype(np.float32), (0, 0), 1.2); s = cv2.GaussianBlur(cv2.imread(sp, 0).astype(np.float32), (0, 0), 1.2)
H, W = s.shape; S = 4
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32); qx = (xx / W - 0.5) * 2; qy = (yy / H - 0.5) * 2
VIG = 1 - 0.38 * np.clip((qx * qx + qy * qy) / 2, 0, 1) ** 1.15
def rast(rings, box):
    x0, y0, x1, y1 = box; m = np.zeros(((y1 - y0) * S, (x1 - x0) * S), np.uint8)
    for rr in rings:
        p = ((np.array(rr).reshape(-1, 2) - [x0, y0]) * S).round().astype(np.int32); t = np.zeros_like(m); cv2.fillPoly(t, [p], 1); m ^= t
    return cv2.resize(m.astype(np.float32), (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA) > 0.5
for name, o in d.items():
    allp = np.concatenate([np.array(rr).reshape(-1, 2) for rr in o['region']])
    x0, y0 = np.floor(allp.min(0)).astype(int) - 4; x1, y1 = np.ceil(allp.max(0)).astype(int) + 6
    x0, y0 = max(0, x0), max(0, y0); x1, y1 = min(W, x1), min(H, y1); box = (x0, y0, x1, y1)
    idx = np.full((y1 - y0, x1 - x0), -1, np.int32); gl = []
    if o['base'] >= 0: idx[rast(o['region'], box)] = 0; gl.append(('base', None))
    core = rast(o['core'], box) if 'core' in o else rast(o['region'], box)
    for k, L in enumerate(o['levels']):
        for j, G in enumerate(L['groups']):
            idx[rast(G['rings'], box)] = len(gl); gl.append((k, j))
    R = r[y0:y1, x0:x1]; Sr = s[y0:y1, x0:x1]; vg = VIG[y0:y1, x0:x1]
    for od in OVER:
        for on, oo in od.items():
            if on != name: core &= ~rast(oo['region'], box)
    for cx, cy, rx, ry in EXE:
        e = np.zeros_like(idx, np.uint8); cv2.ellipse(e, (int(cx - x0), int(cy - y0)), (int(rx), int(ry)), 0, 0, 360, 1, -1); core &= e == 0
    fs = np.linspace(0, 1, 1001)
    def slope(v):  # d post / d pre (0..255 per unit) at pre value v: S-curve slope x vignette (halation ignored: iterate)
        return 255 * (0.65 + 0.35 * 6 * v * (1 - v)) * float(vg.mean())
    lvl = {}; ch = []
    for gi, (k, j) in enumerate(gl):
        m = cv2.erode(((idx == gi) & core).astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
        if m.sum() < 8: continue
        dd = float(np.median(Sr[m] - R[m]))
        lvl.setdefault(k, []).append((m.sum(), dd))
        if m.sum() >= 40:
            v = o['base'] if k == 'base' else o['levels'][k]['groups'][j]['v']
            nv = float(np.clip(v + dd / slope(v), 0, 1))
            if k == 'base': o['base'] = round(nv, 3)
            else: o['levels'][k]['groups'][j]['v'] = round(nv, 3)
            ch.append(dd)
    for k, L in enumerate(o['levels']):   # small groups: their level's pixel-weighted median shift
        if k not in lvl: continue
        w = np.array([a for a, _ in lvl[k]], float); dv = np.array([b for _, b in lvl[k]]); med = float(np.sum(w * dv) / w.sum())
        for j, G in enumerate(L['groups']):
            m = (idx == gl.index((k, j))) if (k, j) in gl else None
            if m is not None and m.sum() < 40 and m.sum() > 0: G['v'] = round(float(np.clip(G['v'] + med / slope(G['v']), 0, 1)), 3)
    for P in o.get('mesh', {}).get('parts', []):   # mesh faces: match the mean and the lattice's contrast
        m = cv2.erode(rast(P['rings'], box).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        if m.sum() < 30: continue
        R0 = cv2.imread(rp, 0).astype(np.float32)[y0:y1, x0:x1]; S0 = cv2.imread(sp, 0).astype(np.float32)[y0:y1, x0:x1]
        hr = R0 - cv2.GaussianBlur(R0, (0, 0), 4); hs = S0 - cv2.GaussianBlur(S0, (0, 0), 4)
        dmu = float(S0[m].mean() - R0[m].mean())
        if not P.get('overlay'): P['mu'] = round(float(np.clip(P['mu'] + dmu / slope(P['mu']), 0, 1)), 3)
        if P.get('amp'): P['amp'] = round(float(P['amp'] * np.clip(hs[m].std() / max(1, hr[m].std()), 0.5, 3)), 3)
        print(name, 'mesh part dmu %.1f  std src %.1f render %.1f' % (dmu, hs[m].std(), hr[m].std()))
    print(name, 'groups calibrated', len(ch), 'median |d| %.1f  max %.1f' % (np.median(np.abs(ch)) if ch else 0, np.max(np.abs(ch)) if ch else 0))
json.dump(d, open(op, 'w'))
