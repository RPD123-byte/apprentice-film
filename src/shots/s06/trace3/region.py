#!/usr/bin/env python3
# region.py: the r3 measurement pipeline for one drawn layer of s06 (measurement only; the film never loads this or
# any image). A layer is described by
#   ground : the soft value under the strokes (a morphological closing of the ungraded source, the dark strokes and
#            anything masked out removed), written as nested outlines at fixed value steps (drawn blurred);
#   solids : the thick dark shapes (lash lines, pupils, nostrils ...), outlines of the source value at two or three
#            dark levels after an opening that keeps only shapes wider than a few px;
#   ink    : dark pen strokes traced on what the ground + solids still lack (trace3.py), then calibrated by
#            analysis-by-synthesis (fit.py) — widths per point, one tone per stroke;
#   light  : pale strokes on dark (iris streaks, hair sheen), traced and calibrated the same way.
# Everything written is outlines, centre-lines, widths and values: no pixels.
import cv2, numpy as np
from trace3 import trace, ground_of
from raster import draw_ink, draw_masses, draw_masses_layer, coverage
from fit import fit


def rings_of(m, off, eps=0.5, mina=6, smooth=2, minhole=0):
    cs, hier = cv2.findContours(m.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    R = []
    for ci, c in enumerate(cs):
        hole = hier is not None and hier[0][ci][3] >= 0
        if abs(cv2.contourArea(c)) < (minhole if hole else mina): continue
        c = c[:, 0, :].astype(np.float32)
        if smooth and len(c) > 2 * smooth + 2:
            k = 2 * smooth + 1; ext = np.vstack([c[-smooth:], c, c[:smooth]])
            c = np.stack([np.convolve(ext[:, 0], np.ones(k) / k, 'valid'), np.convolve(ext[:, 1], np.ones(k) / k, 'valid')], 1)
        a = cv2.approxPolyDP(c.reshape(-1, 1, 2).astype(np.float32), eps, True)[:, 0, :]
        if len(a) >= 3: R.append([round(float(v), 2) for v in (a + np.array(off, np.float32)).ravel()])
    return R


def level_items(val, region, levels, off, sample=None, eps=0.5, mina=8, smooth=2, open_px=0, keep=None, minhole=3):
    """nested outlines val < l for each l (descending), each filled with the median of `sample` in its band.
    keep(l) -> extra bool mask the level must also satisfy."""
    sample = val if sample is None else sample
    items = []
    for i, l in enumerate(levels):
        m = ((val < l) & region).astype(np.uint8)
        if keep is not None: m &= keep(l).astype(np.uint8)
        if open_px: m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (open_px, open_px)))
        lo = levels[i + 1] if i + 1 < len(levels) else -1
        band = (m > 0) & (val >= lo)
        if band.sum() < 3: continue
        v = float(np.median(sample[band]))
        R = rings_of(m, off, eps, mina, smooth, minhole=minhole)
        if R: items.append([round(v, 4)] + R)
    return items


def retone(st, q=0.5):
    out = []
    for s in st:
        A = np.asarray(s, np.float64).reshape(-1, 5).copy(); A[:, 3] = float(np.quantile(A[:, 3], q)); out.append(A.ravel().tolist())
    return out


def build(pre, region, box, *, exclude=None, stroke_mask=None, ground_img=None, ground_r=6, ground_blur=1.5,
          gstep=0.025, gblur=2.0, base=None, solids=(0.30, 0.16), solid_open=4, solid_blur=0.6, trace_kw=None,
          trace2_kw=None, ink_opts=None, fit_iters=8, gsig=3.0, light_mask=None, light_kw=None, light_opts=None, under=None,
          log=print, ground_fit=True, pad=24, passes=2, gfit_rounds=3, twoscale=None, tone_q=0.5,
          ground_mode='close', light_passes=1, solid_dark=False):
    """pre: ungraded source (full frame, 0..1). region: bool mask where this layer paints (full frame).
    exclude: bool mask of things drawn by other layers ON TOP (hair ...), or regions left to moving layers: no strokes
    there, the ground is inpainted. ground_img: a full-frame image to use as the ground instead (a layer drawn over
    another one: then only solids / ink / light are made). under: what lies under the layer outside `region` (for the
    render model; default: the target itself)."""
    H, W = pre.shape
    x0, y0, x1, y1 = box
    cx0, cy0, cx1, cy1 = max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)
    off = (cx0, cy0)
    T = pre[cy0:cy1, cx0:cx1].astype(np.float32).copy()
    Rg = region[cy0:cy1, cx0:cx1].copy()
    Ex = exclude[cy0:cy1, cx0:cx1].copy() if exclude is not None else np.zeros_like(Rg)
    Sm = (stroke_mask[cy0:cy1, cx0:cx1] if stroke_mask is not None else Rg) & ~Ex
    M = Rg & ~Ex
    ink_opts = ink_opts or {'end': 4, 'endMin': 0.2, 'soft': 0.6, 'wMin': 0.3}
    # 1. ground
    if ground_img is None:
        G = ground_of(T, ground_r, ground_blur, ground_mode)
        if Ex.any():
            # under the excluded parts the ground is filled in from the surrounding ground (normalised convolution,
            # only from pixels that are ground-like: not excluded, and not much darker than their neighbourhood)
            Exd = cv2.dilate(Ex.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
            ok = (~Exd).astype(np.float32)
            if ground_mode == 'close':
                # skin-like only: near the local top of the ground (hair edges, strands and hatching left out)
                top = cv2.dilate(G, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
                ok *= (G > top - 0.06).astype(np.float32)
            Gf = G.copy()
            for sg in (6, 14, 30):
                num = cv2.GaussianBlur(G * ok, (0, 0), sg); den = cv2.GaussianBlur(ok, (0, 0), sg)
                fill = num / np.maximum(den, 1e-4)
                m = Exd & (den > 0.05) & (Gf == G)
                Gf[m] = fill[m]
            G = np.where(Ex, Gf, G)
    else:
        G = ground_img[cy0:cy1, cx0:cx1].astype(np.float32).copy()
    Ts = cv2.GaussianBlur(T, (0, 0), 0.8)
    # 2. solids (only where the source is darker than the ground by a clear margin)
    sitems = []
    if solids:
        # thick darks: clearly darker than their ground, or dark shapes wider than the closing (lash lines, pupils),
        # where the ground itself is dark
        keep = (lambda l: ((G - Ts) > 0.12) | (G < l + 0.08)) if solid_dark else (lambda l: (G - Ts) > 0.12)
        sitems = level_items(Ts, M, list(solids), off, sample=T, eps=0.4, mina=6, smooth=1, open_px=solid_open, keep=keep)
    def compose(Gc, ink=None, light=None, gitems=None):
        if gitems is not None:
            C = np.zeros_like(T); draw_masses_layer(C, gitems['items'], blur=gblur, off=off, base=gitems['base'])
        else: C = Gc.copy()
        draw_masses_layer(C, sitems, blur=solid_blur, off=off)
        if ink: draw_ink(C, ink, ink_opts, off=off)
        if light: draw_ink(C, light, {**(light_opts or ink_opts), 'bright': True}, off=off)
        return C
    # 3. ink traced on what the ground + solids still lack, calibrated; a second pass picks up what is still missing
    tk = dict(lo=0.01, hi=0.025, dmin=0.02, sigmas=(0.8, 1.2, 1.7, 2.4)); tk.update(trace_kw or {})
    ink = []
    Gcur = G.copy()
    for ps in range(passes):
        base_gs = compose(Gcur, ink)
        Gf = np.ones((H, W), np.float32); Gf[cy0:cy1, cx0:cx1] = base_gs
        Mf = np.zeros((H, W), bool); Mf[cy0:cy1, cx0:cx1] = Sm
        kw = tk if ps == 0 else {**tk, **(trace2_kw or {'lo': 0.02, 'hi': 0.045, 'dmin': 0.03})}
        new, _ = trace(pre, Mf, ground=Gf, **kw)
        new = retone(new, tone_q)
        log(f'  ink pass {ps + 1}: +{len(new)} strokes')
        ink = ink + new
        base_g = compose(Gcur)
        L = []
        ink, Gs, _ = fit(ink, base_g, T, M, ink_opts, off=off, iters=fit_iters, log=L, gk=1.0, gsig=gsig,
                         ground_fix=(ground_fit and ground_img is None), fix_tone=True, twoscale=twoscale)
        Gcur = np.clip(Gcur + (Gs - base_g), 0, 1)
        log('    fit: ' + ' '.join(f'{v:.2f}' for v in L))
    GI = None
    if ground_img is None:
        # 4. the ground as nested outlines at fixed steps (what the film draws); their values and the ink re-fitted
        gbase = float(np.quantile(Gcur[M], 0.999)) if base is None else base   # (the top level: nothing brighter is capped)
        levels = [round(gbase - gstep * (k + 0.5), 4) for k in range(int(gbase / gstep))]
        # (the outlines run on past the region's edge, so the blur does not pale its border; the film clips to it)
        Rgd = cv2.dilate(Rg.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))) > 0
        gitems = level_items(cv2.GaussianBlur(Gcur, (0, 0), 0.7), Rgd, levels, off, sample=Gcur, eps=0.6, mina=6, smooth=2)
        GI = {'base': round(gbase, 4), 'items': gitems}
        # topmost-item index per pixel (for the value fit)
        top = np.full(T.shape, -1, np.int32)
        for k, it in enumerate(gitems):
            a = coverage([np.asarray(r, np.float64).reshape(-1, 2) for r in it[1:]], T.shape, off)
            top[a > 0.5] = k
        for rd in range(gfit_rounds):
            R = compose(None, ink, gitems=GI)
            E = cv2.GaussianBlur(R, (0, 0), 2.0) - cv2.GaussianBlur(T, (0, 0), 2.0)
            for k, it in enumerate(gitems):
                b = (top == k) & M
                if b.sum() > 20: it[0] = round(float(np.clip(it[0] - 0.8 * np.mean(E[b]), 0, 1)), 4)
            b = (top == -1) & M
            if b.sum() > 20: GI['base'] = round(float(np.clip(GI['base'] - 0.8 * np.mean(E[b]), 0, 1)), 4)
            Cq = np.zeros_like(T); draw_masses_layer(Cq, gitems, blur=gblur, off=off, base=GI['base'])
            L = []
            ink, _, _ = fit(ink, compose(Cq), T, M, ink_opts, off=off, iters=3, log=L, ground_fix=False, fix_tone=True, twoscale=twoscale)
            log(f'  ground values + ink refit {rd + 1}: ' + ' '.join(f'{v:.2f}' for v in L))
        Gq = Cq
    else:
        Gq = G
    # 5. pale strokes where the drawing is dark but the source has light marks (one or more passes)
    light = []
    if light_mask is not None:
        lk = dict(lo=0.02, hi=0.05, dmin=0.04, sigmas=(0.7, 1.0, 1.5)); lk.update(light_kw or {})
        Lm = np.zeros((H, W), bool); Lm[cy0:cy1, cx0:cx1] = light_mask[cy0:cy1, cx0:cx1] & M
        lop = {**(light_opts or ink_opts), 'bright': True}
        for ps in range(light_passes):
            C1 = compose(Gq, ink, light)
            Gf = np.ones((H, W), np.float32); Gf[cy0:cy1, cx0:cx1] = C1
            new, _ = trace(pre, Lm, ground=Gf, bright=True, **(lk if ps == 0 else {**lk, 'lo': lk['lo'] * 1.6, 'hi': lk['hi'] * 1.6}))
            new = retone(new, 1 - tone_q)
            light = light + new
            if light:
                L = []
                C0l = compose(Gq, ink)
                light, _, _ = fit(light, C0l, T, Lm[cy0:cy1, cx0:cx1], lop, off=off, iters=6, log=L, ground_fix=False,
                                  fix_tone=True, twoscale=twoscale)
                log(f'  light pass {ps + 1}: {len(light)} strokes; fit ' + ' '.join(f'{v:.2f}' for v in L))
    R = compose(Gq, ink, light)
    U = T if under is None else under[cy0:cy1, cx0:cx1]
    Rv = np.where(Rg, R, U)
    return dict(ground=GI, solids=sitems, ink=ink, light=light, render=Rv, layer=R, crop=(cx0, cy0, cx1, cy1), mask=M, T=T)


def report(name, res, box=None, log=print):
    cx0, cy0, cx1, cy1 = res['crop']; R = res['render']; T = res['T']; M = res['mask']
    out = {}
    for s in (0, 1.5, 5):
        a = cv2.GaussianBlur(R, (0, 0), s) if s else R; b = cv2.GaussianBlur(T, (0, 0), s) if s else T
        out[s] = float(np.abs(a - b)[M].mean() * 255)
    log(f'{name}: MAE (ungraded, x255) raw {out[0]:.2f}  s1.5 {out[1.5]:.2f}  s5 {out[5]:.2f}')
    return out
