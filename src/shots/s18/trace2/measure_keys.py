#!/usr/bin/env python3
# measure_keys.py SP out.json [dbgdir] - the keys pressed down under the owl's feet in shot B, per frame (1382-1417).
# A pressed key shows the side wall of its neighbour as a wedge of parallel dark lines along the key's long side.
# Per frame and wedge this measures: its outline (a few-point polygon), the line direction (structure tensor), the
# line pitch and phase across it (the dominant period of the cross profile), the line width (dark fraction x pitch),
# the dark and paper tones. The film draws each wedge with those measured parallel lines (no pixels).
import sys, os, json, math, numpy as np, cv2
SP, out = sys.argv[1], sys.argv[2]; dbg = sys.argv[3] if len(sys.argv) > 3 else None
Z = np.load(SP + '/owlB_frames.npz')
E_ = lambda k: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
res = {}
for n in range(1382, 1418):
    if n == 1401: continue
    P = Z[f'P{n}'].astype(np.float32); E = Z[f'E{n}'].astype(np.float32)
    # the owl in this frame: clearly brighter than the plate under it, or plumage-textured; grown generously
    owl = (cv2.GaussianBlur(P, (0, 0), 2) - cv2.GaussianBlur(E, (0, 0), 2) > 0.15).astype(np.uint8)
    owl = cv2.morphologyEx(owl, cv2.MORPH_OPEN, E_(5))
    dark = ((E - cv2.GaussianBlur(P, (0, 0), 0.7)) > 0.3).astype(np.uint8)
    dark[:560] = 0; dark[800:] = 0; dark[owl > 0] = 0
    # keep only straight line texture running along the keys' long sides (8-24 deg below horizontal): the wedge
    # hatching, not the talons' curves
    gx = cv2.Sobel(P, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(P, cv2.CV_32F, 0, 1, ksize=3)
    Jxx = cv2.GaussianBlur(gx * gx, (0, 0), 4); Jxy = cv2.GaussianBlur(gx * gy, (0, 0), 4); Jyy = cv2.GaussianBlur(gy * gy, (0, 0), 4)
    lang = 0.5 * np.arctan2(2 * Jxy, Jxx - Jyy) + np.pi / 2
    lang = (lang + np.pi / 2) % np.pi - np.pi / 2
    coh = np.sqrt((Jxx - Jyy) ** 2 + 4 * Jxy ** 2) / (Jxx + Jyy + 1e-6)
    okd = (np.degrees(lang) > 8) & (np.degrees(lang) < 24) & (coh > 0.55)
    dark = (dark & okd).astype(np.uint8)
    band = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, E_(9))
    band = cv2.morphologyEx(band, cv2.MORPH_OPEN, E_(5))
    nb, lab, st, _ = cv2.connectedComponentsWithStats(band, 8)
    items = []
    for i in range(1, nb):
        if st[i, 4] < 250: continue
        m = (lab == i).astype(np.uint8)
        # must be line texture: several dark lines -> the dark fraction inside is well under 1
        frac = float(dark[m > 0].mean())
        if frac > 0.85 or frac < 0.2: continue
        cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        c = max(cs, key=cv2.contourArea)
        poly = cv2.approxPolyDP(cv2.convexHull(c), 3.0, True)[:, 0, :].astype(float)
        # direction of the lines: structure tensor of P inside the band
        gx = cv2.Sobel(P, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(P, cv2.CV_32F, 0, 1, ksize=3)
        J = [float((gx * gx)[m > 0].sum()), float((gx * gy)[m > 0].sum()), float((gy * gy)[m > 0].sum())]
        th = 0.5 * math.atan2(2 * J[1], J[0] - J[2])      # gradient direction; lines run perpendicular to it
        ang = th + math.pi / 2
        ux, uy = math.cos(ang), math.sin(ang); nx, ny = -uy, ux   # along / across
        ys, xs = np.nonzero(m)
        tt = xs * ux + ys * uy; tq = np.quantile(tt, 0.7)
        sel = tt >= tq                                              # the wide front part of the wedge
        xs_all, ys_all = xs, ys
        xs, ys = xs[sel], ys[sel]
        s = (xs - xs.mean()) * nx + (ys - ys.mean()) * ny           # across-coordinate of every pixel
        v = P[ys, xs]
        lo, hi = s.min(), s.max(); nbin = int(math.ceil((hi - lo) / 0.5)) + 1
        prof = np.bincount(((s - lo) / 0.5).astype(int), weights=v, minlength=nbin) / np.maximum(1, np.bincount(((s - lo) / 0.5).astype(int), minlength=nbin))
        pr = prof - prof.mean()
        best = None
        for per in np.arange(3.0, 10.01, 0.25):
            k = 2 * math.pi / per; xx = lo + np.arange(len(pr)) * 0.5
            a, b = float((pr * np.cos(k * xx)).sum()), float((pr * np.sin(k * xx)).sum())
            pw = a * a + b * b
            if best is None or pw > best[0]: best = (pw, per, math.atan2(b, a))
        _, per, phs = best
        # dark line centres: where cos(k s - phs) = -1  ->  s0 = (phs + pi) / k  (mod per); in absolute px along the normal
        k = 2 * math.pi / per; s0 = ((phs + math.pi) / k) % per
        off0 = float(xs.mean() * nx + ys.mean() * ny + s0)
        dv = float(np.percentile(v, 8)); pv = float(np.percentile(v, 92))
        wdt = float(np.clip((pv - v.mean()) / max(0.05, pv - dv), 0.15, 0.85) * per)
        # the wedge's lines fan out from its back tip: the apex (the polygon point furthest back along the lines)
        # and the front edge (the band's extent across the lines at its front)
        pt = poly[:, 0] * ux + poly[:, 1] * uy; apex = poly[int(np.argmin(pt))]
        tf = float(np.quantile(xs_all * ux + ys_all * uy, 0.97))
        near = np.abs(xs_all * ux + ys_all * uy - tf) < 3
        sf = xs_all[near] * nx + ys_all[near] * ny
        nlines = max(2, int(round((sf.max() - sf.min()) / per)) + 1) if near.any() else 3
        items.append(dict(apex=[round(float(apex[0]) + 0.5, 1), round(float(apex[1]) + 0.5, 1)], tf=round(tf + 0.5 * ux + 0.5 * uy, 1),
                          sf=[round(float(sf.min()) + 0.5 * nx + 0.5 * ny, 1), round(float(sf.max()) + 0.5 * nx + 0.5 * ny, 1)] if near.any() else None, n=nlines, poly=[[round(x + 0.5, 1), round(y + 0.5, 1)] for x, y in poly], ang=round(ang, 4), per=round(float(per), 2),
                          off=round(off0 + 0.5 * nx + 0.5 * ny, 2), w=round(wdt, 2), dark=round(dv, 3), paper=round(pv, 3), area=int(st[i, 4])))
    # the pressed key's dropped front: short straight dark lines (horizontal across the key, vertical at its side)
    # that the plate does not have; each measured as a segment (end points, width, tone)
    dk2 = ((E - cv2.GaussianBlur(P, (0, 0), 0.7)) > 0.3).astype(np.uint8)
    dk2[:680] = 0; dk2[800:] = 0; dk2[owl > 0] = 0
    for it in items: cv2.fillPoly(dk2, [np.int32(np.array(it['poly']) - 0.5)], 0)
    segs = []
    nl, labl, stl, _ = cv2.connectedComponentsWithStats(cv2.morphologyEx(dk2, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)), 8)
    for i in range(1, nl):
        x, y, w_, h_, a = stl[i]
        if a < 25 or max(w_, h_) < 18: continue
        ys, xs = np.nonzero(labl == i)
        c = np.cov(np.stack([xs, ys]).astype(float)); ev, evec = np.linalg.eigh(c)
        if ev[1] < 9 * max(ev[0], 0.1): continue          # not a line
        d = evec[:, 1]; ang2 = math.degrees(math.atan2(d[1], d[0])) % 180
        if not (ang2 < 10 or ang2 > 170 or 80 < ang2 < 100): continue
        tproj = (xs - xs.mean()) * d[0] + (ys - ys.mean()) * d[1]
        p0 = [xs.mean() + d[0] * tproj.min(), ys.mean() + d[1] * tproj.min()]; p1 = [xs.mean() + d[0] * tproj.max(), ys.mean() + d[1] * tproj.max()]
        L = float(tproj.max() - tproj.min()) + 1
        segs.append([round(p0[0] + 0.5, 1), round(p0[1] + 0.5, 1), round(p1[0] + 0.5, 1), round(p1[1] + 0.5, 1), round(float(a) / L, 2), round(float(np.percentile(P[ys, xs], 20)), 3)])
    res[n] = items
    res.setdefault('lines', {})[n] = segs
    print(n, [(it['area'], it['per'], round(math.degrees(it['ang']), 1), it['w']) for it in items], 'lines', len(segs), flush=True)
    if dbg:
        im = cv2.cvtColor((np.clip(P, 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
        for it in items: cv2.polylines(im, [np.int32(it['poly'])], True, (0, 0, 255), 2)
        for sg in segs: cv2.line(im, (int(sg[0]), int(sg[1])), (int(sg[2]), int(sg[3])), (0, 255, 0), 2)
        cv2.imwrite(f'{dbg}/k{n}.jpg', im[500:820, 150:1600])
res[1401] = res[1400]; res['lines'][1401] = res['lines'][1400]
json.dump(res, open(out, 'w'))
