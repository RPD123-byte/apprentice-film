#!/usr/bin/env python3
# cel.py ref.png spec.json out.json [dbg.png]
# Cel trace of a flat-shaded ink drawing (headphone cups, beak): inside a region, the reference is posterised at a
# few thresholds and each level's mask becomes polygon rings (outer rings + holes, even-odd), simplified (RDP).
# Each level's value is the median source value of the pixels in that level band, converted to a PRE-grade value
# (inverse filmic S-curve and vignette at the region's centre) so it lands on the source after the global grade.
# Writes control points only: {name: {base, levels: [{v, rings: [[x,y,...]]}]}}. No pixels.
# spec: {name: {poly: [[x,y]...] (region), cut: [[poly]...] (optional excluded polygons), thr: [t1, t2, ...] (post-grade
#        levels 0..255), eps: RDP px, minA: min ring area px^2, blur: pre-blur sigma, up: supersample}}
import cv2, numpy as np, json, sys
ref = cv2.imread(sys.argv[1], 0).astype(np.float32); spec = json.load(open(sys.argv[2])); H, W = ref.shape
fs = np.linspace(0, 1, 2001); Sf = 0.65 * fs + 0.35 * (3 * fs * fs - 2 * fs ** 3)
def pre(v, x, y):   # post-grade value (0..255) at (x, y) -> pre-grade 0..1 (S-curve and vignette only)
    qx = (x / W - 0.5) * 2; qy = (y / H - 0.5) * 2; r = min(1, (qx * qx + qy * qy) / 2); vig = 1 - 0.38 * r ** 1.15
    return float(np.interp(min(1, v / 255 / vig), Sf, fs))
# the whole grade inverted per pixel (post.js: halation = screen blend of halo x soft highlights, then the S-curve and
# the vignette): the pre-grade image that lands on the source. Halation is estimated from the estimate itself (2 passes).
HALO = float(__import__('os').environ.get('HALO', '0.42'))
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
qx = (xx / W - 0.5) * 2; qy = (yy / H - 0.5) * 2; VIG = 1 - 0.38 * np.clip((qx * qx + qy * qy) / 2, 0, 1) ** 1.15
def halation(X):
    q = cv2.resize(X, (round(W / 4), round(H / 4)), interpolation=cv2.INTER_AREA)
    hl = np.clip((q - 120 / 255) / (135 / 255), 0, 1) * q
    hb = 0.6 * cv2.GaussianBlur(hl, (0, 0), 5) + 0.4 * cv2.GaussianBlur(hl, (0, 0), 16)
    return cv2.resize(hb, (W, H), interpolation=cv2.INTER_LINEAR)
FH = np.interp(np.clip(ref / 255 / VIG, 0, 1), Sf, fs).astype(np.float32); PRE = FH.copy()
for _ in range(2): hb = halation(PRE); PRE = np.clip(1 - (1 - FH) / np.maximum(0.2, 1 - HALO * hb), 0, 1).astype(np.float32)
out = {}; dbg = cv2.cvtColor(ref.astype(np.uint8), cv2.COLOR_GRAY2BGR) if len(sys.argv) > 4 else None
for name, s in spec.items():
    up = s.get('up', 2); eps = s.get('eps', 0.8); minA = s.get('minA', 6); sig = s.get('blur', 0.6)
    reg = np.zeros((H, W), np.uint8); cv2.fillPoly(reg, [np.array(s['poly'], np.int32)], 1)
    for c in s.get('cut', []): cv2.fillPoly(reg, [np.array(c, np.int32)], 0)
    zone_core = None
    if 'sil' in s:
        # a zone of one part's plumage: the zone polygon inside the part's measured silhouette (hard along the
        # silhouette, feathered along the zone's own edge, which runs through the fur)
        sm = np.zeros((H, W), np.uint8)
        if 'lit' in s['sil']:   # the lit drawing itself (everything brighter than the black ground), holes filled
            sm = (cv2.GaussianBlur(ref, (0, 0), 1) > s['sil']['lit']).astype(np.uint8)
            cs, _ = cv2.findContours(sm.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
            for c in cs:
                if cv2.contourArea(c) > 400: cv2.drawContours(sm, [c], -1, 1, -1)
        else:
            SJ = json.load(open(s['sil']['file']))[s['sil']['key']]
            for r in SJ:
                t = np.zeros((H, W), np.uint8); cv2.fillPoly(t, [np.array(r).reshape(-1, 2).astype(np.int32)], 1); sm ^= t
        if s['sil'].get('erode'): sm = cv2.erode(sm, np.ones((2 * s['sil']['erode'] + 1,) * 2, np.uint8))
        if s['sil'].get('dilate'): sm = cv2.dilate(sm, np.ones((2 * s['sil']['dilate'] + 1,) * 2, np.uint8))   # overlap the neighbour parts (no cracks)
        fz = s.get('feather_zone', 6)
        zone_core = cv2.erode(reg, np.ones((2 * fz + 1, 2 * fz + 1), np.uint8)) & sm
        reg = reg & sm
    if 'plume_seeds' in s:
        # drop the plumage: bright components (blur 1.5 > plume_thr) holding a seed, holes filled, grown back by
        # `grow` px into the region's side so the cel edge includes the ink/plumage transition
        b = cv2.GaussianBlur(ref, (0, 0), 1.5) > s.get('plume_thr', 170)
        n, lab = cv2.connectedComponents(b.astype(np.uint8), connectivity=4)
        pl = np.zeros((H, W), np.uint8)
        for sx, sy in s['plume_seeds']:
            if lab[sy, sx]: pl |= (lab == lab[sy, sx]).astype(np.uint8)
        ff = pl.copy(); cs, _ = cv2.findContours(ff, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(pl, cs, -1, 1, -1)
        er = s.get('grow', 2)
        if er > 0: pl1 = cv2.erode(pl, np.ones((2 * er + 1, 2 * er + 1), np.uint8))
        else: pl1 = pl
        if s.get('grow_zones'):   # inside these zones the cel reaches further into the fur (covers the silhouette gap)
            gz = np.zeros((H, W), np.uint8)
            for c in s['grow_zones']: cv2.fillPoly(gz, [np.array(c, np.int32)], 1)
            G = s.get('grow_far', 8); plg = cv2.erode(pl, np.ones((2 * G + 1, 2 * G + 1), np.uint8))
            pl1 = np.where(gz > 0, plg, pl1)
        core_pl = pl if er <= 0 else cv2.erode(pl, np.ones((2 * er + 1, 2 * er + 1), np.uint8))
        pl = pl1
        core = reg & (1 - core_pl)
        reg &= 1 - pl
        if s.get('bg_thr') is not None:   # and the far black background (keep a margin round the ink)
            nb = (cv2.GaussianBlur(ref, (0, 0), 1) > s['bg_thr']).astype(np.uint8)
            m = s.get('bg_margin', 4); reg &= cv2.dilate(nb, np.ones((2 * m + 1, 2 * m + 1), np.uint8))
        for c in s.get('keep', []):   # zones traced whole, plumage included (shadow hatching on the fur)
            kp = np.zeros((H, W), np.uint8); cv2.fillPoly(kp, [np.array(c, np.int32)], 1); reg |= kp
        reg = cv2.morphologyEx(reg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        n, lab, st, _ = cv2.connectedComponentsWithStats(reg, connectivity=4)
        keep = [i for i in range(1, n) if st[i, 4] >= s.get('minComp', 200)]
        reg = np.isin(lab, keep).astype(np.uint8)
        # the hard core: the region without the grow zones' extra reach into the fur (that margin is feathered in JS)
        core = reg & (core | (1 - reg))
        extra = reg & (1 - core)
        for c in s.get('keep', []):
            kp = np.zeros((H, W), np.uint8); cv2.fillPoly(kp, [np.array(c, np.int32)], 1); extra &= 1 - kp
        core = reg & (1 - extra)
    meshm = None
    if 'mesh' in s:
        # the metal mesh (a +-45 deg cross-hatch, ~3.3 px pitch): both diagonal Gabor energies high, the axis ones low;
        # its areas are cut from the cel region and returned as their own polygons with a blurred-tone posterisation
        M = s['mesh']; E = []
        for th in (np.pi / 4, 3 * np.pi / 4, 0, np.pi / 2):
            k1 = cv2.getGaborKernel((15, 15), 2.5, th, M.get('lam', 3.3), 1, 0); k2 = cv2.getGaborKernel((15, 15), 2.5, th, M.get('lam', 3.3), 1, np.pi / 2); k1 -= k1.mean()
            a = cv2.filter2D(ref, -1, k1); b = cv2.filter2D(ref, -1, k2); E.append(cv2.GaussianBlur(np.sqrt(a * a + b * b), (0, 0), 3))
        mm = np.minimum(E[0], E[1]) / (1 + np.maximum(E[2], E[3]) * 0.5)
        mb = ((mm > M.get('thr', 4.0)) & (reg > 0)).astype(np.uint8)
        mb = cv2.morphologyEx(mb, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
        n, lab, st, _ = cv2.connectedComponentsWithStats(mb, connectivity=4)
        mb = np.isin(lab, [i for i in range(1, n) if st[i, 4] >= M.get('minA', 800)]).astype(np.uint8)
        cs, _ = cv2.findContours(mb.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(mb, cs, -1, 1, -1)
        for c in M.get('add', []): cv2.fillPoly(mb, [np.array(c, np.int32)], 1)
        for c in M.get('sub', []): cv2.fillPoly(mb, [np.array(c, np.int32)], 0)
        er = M.get('erode', 1)
        if er: mb = cv2.erode(mb, np.ones((2 * er + 1, 2 * er + 1), np.uint8))
        for P in M.get('parts', []):
            if isinstance(P, dict) and P.get('fit') == 'poly': cv2.fillPoly(mb, [np.array(P['poly'], np.int32)], 1)
            if isinstance(P, dict) and isinstance(P.get('fit'), list):
                f = P['fit']; cv2.ellipse(mb, ((f[0], f[1]), (2 * f[2], 2 * f[3]), f[4]), 1, -1)
        meshm = mb
        if not M.get('overlay'): reg = reg & (1 - mb)
    g = cv2.GaussianBlur(ref, (0, 0), sig) if sig > 0 else ref
    if meshm is not None and s['mesh'].get('overlay'):
        # overlay mode: the mesh faces stay in the cel, posterised from a blur that removes the lattice (period ~3.1 px)
        # but keeps its shading and the ink round it; the lattice is laid over them in JS (overlay blend)
        gm = cv2.GaussianBlur(ref, (0, 0), s['mesh'].get('mblur', 1.5)); fm = cv2.GaussianBlur(meshm.astype(np.float32), (0, 0), 1.0)
        g = g * (1 - fm) + gm * fm
    gu = cv2.resize(g, None, fx=up, fy=up, interpolation=cv2.INTER_CUBIC)
    ru = cv2.resize(reg, None, fx=up, fy=up, interpolation=cv2.INTER_NEAREST)
    ys, xs = np.nonzero(reg); cx, cy = xs.mean(), ys.mean()
    ink = bool(s.get('ink'))   # ink-only: just the strokes darker than the first threshold, painted over the fur
    if ink: g = 255 - g; gu = 255 - gu; ref_i = 255 - ref
    thr = [255 - t for t in s['thr']] if ink else s['thr']; bands = [-1] + thr + [999]
    vals = []; bandm = []
    for k in range(len(bands) - 1):
        m = (reg > 0) & (g >= bands[k]) & (g < bands[k + 1]); bandm.append(m)
        vals.append(float(np.median(PRE[m])) if m.sum() > 3 else pre((bands[k] + min(255, bands[k + 1])) / 2, cx, cy))
    # the region outline itself (so the base fill has the region's shape)
    def simp(c):
        a = cv2.approxPolyDP(c, eps * up, True).reshape(-1, 2).astype(np.float64)
        return None if len(a) < 3 else [round(float(v), 1) for v in ((a + 0.5) / up).ravel()]
    def rings_of(mask):
        cs, hi = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
        R = []
        for c in cs:
            if abs(cv2.contourArea(c)) < minA * up * up: continue
            a = simp(c)
            if a: R.append(a)
        return R
    def groups_of(mask, band, vdef):
        # outer rings with their holes; each group's value = median pre-grade target of the pixels it shows
        cs, hi = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
        if hi is None: return []
        hi = hi[0]; G = []
        for i, c in enumerate(cs):
            if hi[i][3] != -1 or abs(cv2.contourArea(c)) < minA * up * up: continue
            ring = simp(c)
            if not ring: continue
            R = [ring]; j = hi[i][2]
            while j != -1:
                if abs(cv2.contourArea(cs[j])) >= minA * up * up:
                    h = simp(cs[j])
                    if h: R.append(h)
                j = hi[j][0]
            x, y, w, h = cv2.boundingRect(c); x0, y0 = x // up, y // up; x1, y1 = min(W, (x + w) // up + 1), min(H, (y + h) // up + 1)
            gm = np.zeros((y1 - y0, x1 - x0), np.uint8)
            for r in R:
                t = np.zeros_like(gm); cv2.fillPoly(t, [(np.array(r).reshape(-1, 2) - [x0, y0] - 0.5).round().astype(np.int32)], 1); gm ^= t
            sel = (gm > 0) & band[y0:y1, x0:x1]
            v = float(np.median(PRE[y0:y1, x0:x1][sel])) if sel.sum() >= 3 else vdef
            G.append({'v': round(v, 3), 'rings': R})
        return G
    o = {'base': -1 if ink else round(vals[0], 3), 'region': rings_of(ru), 'levels': []}
    if zone_core is not None:
        o['core'] = rings_of(cv2.resize(zone_core, None, fx=up, fy=up, interpolation=cv2.INTER_NEAREST))
    if s.get('core_erode'):   # a drawn part set into the fur: hard inside, its outer few px feathered
        e = s['core_erode']; o['core'] = rings_of(cv2.resize(cv2.erode(reg, np.ones((2 * e + 1, 2 * e + 1), np.uint8)), None, fx=up, fy=up, interpolation=cv2.INTER_NEAREST))
    if 'plume_seeds' in s and s.get('grow_zones'):
        o['core'] = rings_of(cv2.resize(core, None, fx=up, fy=up, interpolation=cv2.INTER_NEAREST))
    # the levels reach 2 px past the region edge, so the base fill's antialiased rim never shows through as a dark line
    lg = s.get('level_grow', 2); rug = cv2.dilate(ru, np.ones((2 * lg * up + 1,) * 2, np.uint8)) if lg else ru
    for k, t in enumerate(thr):
        m = (rug > 0) & (gu >= t)
        m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
        o['levels'].append({'v': round(vals[k + 1], 3), 'groups': groups_of(m, bandm[k + 1], vals[k + 1])})
    if meshm is not None:
        # one flat mesh per part (hand polygons: plate / arm / clamp): light and dark = the 88th / 12th percentiles
        M = s['mesh']; g05 = cv2.GaussianBlur(ref, (0, 0), 0.5); ms = {'parts': []}
        for P in M.get('parts', [[[0, 0], [W, 0], [W, H], [0, H]]]):
            fit = None
            if isinstance(P, dict): fit = P.get('fit'); P = P['poly']
            pm = np.zeros((H, W), np.uint8); cv2.fillPoly(pm, [np.array(P, np.int32)], 1); sel = (meshm > 0) & (pm > 0)
            if fit == 'poly': sel = pm > 0   # hand-measured outline of a mesh face
            if sel.sum() < 30: continue
            if isinstance(fit, list):   # a measured ellipse [cx, cy, rx, ry, deg]
                sel = np.zeros((H, W), np.uint8); cv2.ellipse(sel, ((fit[0], fit[1]), (2 * fit[2], 2 * fit[3]), fit[4]), 1, -1); sel = sel > 0
            elif fit == 'ellipse':   # the plate: an ellipse fitted to the detected mesh (its rim is inked round it)
                cs, _ = cv2.findContours(sel.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); c = max(cs, key=cv2.contourArea)
                (ex, ey), (ea, eb), ang = cv2.fitEllipse(c); sh = M.get('shrink', 1.0)
                sel = np.zeros((H, W), np.uint8); cv2.ellipse(sel, ((ex, ey), (ea - 2 * sh, eb - 2 * sh), ang), 1, -1); sel = sel > 0
                print('plate ellipse', round(ex, 1), round(ey, 1), round(ea / 2, 1), round(eb / 2, 1), round(ang, 1))
            elif fit == 'smooth':
                sm = cv2.morphologyEx(sel.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
                sel = cv2.morphologyEx(sm, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8)) > 0
            ev = cv2.erode(sel.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
            if ev.sum() < 30: ev = sel
            lo, hi = np.percentile(g05[ev], [12, 88]); mu = float(ref[ev].mean())
            p05 = cv2.GaussianBlur(PRE, (0, 0), 0.5); plo, phi = np.percentile(p05[ev], [12, 88])
            # the lattice's amplitude: std of the high-passed pre-grade target, over our own 0.4 px softening (x0.73)
            hp = PRE - cv2.GaussianBlur(PRE, (0, 0), 4); amp = float(hp[ev].std()) / 0.73
            if M.get('overlay'): amp = amp / (2 * max(0.1, min(float(PRE[ev].mean()), 1 - float(PRE[ev].mean()))))   # overlay: d = 2 base x (blend - 0.5)
            ms['parts'].append({'rings': rings_of(cv2.resize(sel.astype(np.uint8), None, fx=up, fy=up, interpolation=cv2.INTER_NEAREST)),
                                'mu': round(float(PRE[ev].mean()), 3), 'amp': round(amp, 3), 'overlay': bool(M.get('overlay')), 'lo': round(float(plo), 3), 'hi': round(float(phi), 3), 'post': [round(float(lo)), round(mu), round(float(hi))]})
        o['mesh'] = ms
        print(name, 'mesh', [q['post'] for q in ms['parts']])
    out[name] = o
    n = sum(len(r) // 2 for L in o['levels'] for G in L['groups'] for r in G['rings'])
    print(name, 'values', [round(v, 3) for v in vals], 'groups', [len(L['groups']) for L in o['levels']], 'pts', n)
    if dbg is not None:
        for L in o['levels']:
            for r in [r for G in L['groups'] for r in G['rings']]:
                p = (np.array(r).reshape(-1, 2)).astype(np.int32); cv2.polylines(dbg, [p], True, (0, 0, 255), 1)
if dbg is not None: cv2.imwrite(sys.argv[4], dbg)
json.dump(out, open(sys.argv[3], 'w'))
