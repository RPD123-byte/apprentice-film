# vtrace.py — vector trace of a source frame region (measurement -> vector data only).
# trace(U8, mask, off, P) -> (regions, inks)
#   U8: ungraded (pre-grade) BGR uint8 crop, mask: uint8 0/1 crop (where to trace), off: (x0, y0) of the crop in frame px
#   regions: [area, '#rrggbb', outer, hole, ...]  (flat int lists, frame px x2)
#   inks:    {'#rrggbb': [[outer, hole...], ...]}  thin dark lines (and 'w' bright lines) with measured tones
import cv2, numpy as np

S = 2  # contour supersampling


def contours_of(mk, eps, minarea, smooth, off, holes_min=0.5):
    M = cv2.resize(mk.astype(np.float32), None, fx=S, fy=S, interpolation=cv2.INTER_LINEAR)
    if smooth: M = cv2.GaussianBlur(M, (0, 0), smooth * S)
    B = (M > 0.5).astype(np.uint8)
    cnts, hier = cv2.findContours(B, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    if hier is None: return out
    for i, c in enumerate(cnts):
        if hier[0][i][3] >= 0: continue
        a = cv2.contourArea(c)
        if a < minarea * S * S: continue
        o = cv2.approxPolyDP(c, eps * S, True).reshape(-1, 2) / S + off
        if len(o) < 3: continue
        hs = []; j = hier[0][i][2]
        while j >= 0:
            if cv2.contourArea(cnts[j]) >= minarea * S * S * holes_min:
                h = cv2.approxPolyDP(cnts[j], eps * S, True).reshape(-1, 2) / S + off
                if len(h) >= 3: hs.append(h)
            j = hier[0][j][0]
        out.append((a / (S * S), o, hs))
    return out


fl = lambda p: [int(round(v * 2)) for xy in p for v in xy]
hexc = lambda c: '#%02x%02x%02x' % tuple(int(max(0, min(255, round(v)))) for v in c)


def poly_mask(shape, o, hs, off):
    """bbox-limited mask: returns (M, y0, y1, x0, x1)"""
    oo = np.int32(np.round(o - off))
    x0, y0 = np.maximum(oo.min(0) - 1, 0); x1, y1 = np.minimum(oo.max(0) + 2, [shape[1], shape[0]])
    M = np.zeros((max(1, y1 - y0), max(1, x1 - x0)), np.uint8)
    cv2.fillPoly(M, [oo - [x0, y0]], 1)
    for h in hs: cv2.fillPoly(M, [np.int32(np.round(h - off)) - [x0, y0]], 0)
    return M, y0, y1, x0, x1


def trace(U8, mask, off, P):
    if P.get('base') and not P.get('labonly'):
        # an underpaint: coarse regions of a blurred copy, painted first, so that detail regions too small to keep leave
        # the local average tone behind them (not the black canvas)
        B = dict(K=16, ink=False, wink=False, eps=1.5, minarea=60, smooth=1.5, vote=3); B.update(P['base'])
        Ub = cv2.GaussianBlur(U8, (0, 0), B.get('blur', 3))
        rb, _ = trace(Ub, mask, off, B)
        r, i = trace(U8, mask, off, {k: v for k, v in P.items() if k != 'base'})
        return rb + r, i
    K = P.get('K', 16); eps = P.get('eps', 0.6); mina = P.get('minarea', 4); sm = P.get('smooth', 0.6)
    mk = (mask > 0).astype(np.uint8)
    g = cv2.cvtColor(U8, cv2.COLOR_BGR2GRAY)
    gd = cv2.fastNlMeansDenoising(g, None, P.get('hg', 7), 5, 13)
    inkm = np.zeros_like(mk); wink = np.zeros_like(mk)
    if P.get('ink', True):
        ks = P.get('inkk', 7)
        bh = cv2.morphologyEx(gd, cv2.MORPH_BLACKHAT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ks, ks))).astype(np.float32)
        inkm = ((bh > P.get('inkbh', 22)) & (gd < P.get('inkmax', 150)) | (gd < P.get('inkdark', 0))).astype(np.uint8) * cv2.erode(mk, np.ones((3, 3), np.uint8))
        n_, cc, st, _ = cv2.connectedComponentsWithStats(inkm, connectivity=8)
        small = np.nonzero(st[1:, 4] < P.get('inkmin', 5))[0] + 1
        if len(small): inkm[np.isin(cc, small)] = 0
    if P.get('wink', False):
        ks = P.get('winkk', 7)
        th = cv2.morphologyEx(gd, cv2.MORPH_TOPHAT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ks, ks))).astype(np.float32)
        wink = ((th > P.get('winkth', 40)) & (gd > P.get('winkmin', 120))).astype(np.uint8) * mk
        n_, cc, st, _ = cv2.connectedComponentsWithStats(wink, connectivity=8)
        small = np.nonzero(st[1:, 4] < P.get('winkarea', 8))[0] + 1
        if len(small): wink[np.isin(cc, small)] = 0
    den = cv2.fastNlMeansDenoisingColored(U8, None, P.get('hc', 6), P.get('hc', 6), 5, 13)
    lines = cv2.dilate(np.maximum(inkm, wink), np.ones((3, 3), np.uint8)) if P.get('inkdil', 1) else np.maximum(inkm, wink)
    clean = cv2.inpaint(den, lines * 255, 4, cv2.INPAINT_TELEA) if lines.any() else den
    clean = cv2.bilateralFilter(clean, 7, P.get('bil', 20), 5)
    lab = cv2.cvtColor(clean, cv2.COLOR_BGR2LAB).astype(np.float32)
    if P.get('labonly'): return lab, mk
    yy, xx = np.nonzero(mk)
    regs = []
    if len(xx) >= 20:
        cv2.setRNGSeed(3)
        k = min(K, max(2, len(xx) // 300))
        samp = lab[yy, xx]
        if P.get('centres') is not None:
            cen = np.float32(P['centres']); k = len(cen)
        else:
            rs = np.random.RandomState(7)
            sub = samp[rs.choice(len(samp), min(len(samp), 60000), replace=False)]
            _, _, cen = cv2.kmeans(sub, k, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.3), 3, cv2.KMEANS_PP_CENTERS)
        lb = np.empty(len(samp), np.int32)
        for i0 in range(0, len(samp), 200000):
            d = ((samp[i0:i0 + 200000, None, :] - cen[None]) ** 2).sum(2); lb[i0:i0 + 200000] = d.argmin(1)
        Lb = np.full(mk.shape, -1, np.int32); Lb[yy, xx] = lb
        for it in range(P.get('vote', 2)):
            votes = np.stack([cv2.boxFilter((Lb == j).astype(np.float32), -1, (3, 3)) for j in range(k)])
            Lb = np.where(mk > 0, np.argmax(votes, 0), -1)
        cf = clean.astype(np.float32)
        for j in range(k):
            Lj = (Lb == j).astype(np.uint8)
            for a, o, h in contours_of(Lj, eps, mina, sm, off):
                M, y0, y1, x0, x1 = poly_mask(mk.shape, o, h, off)
                M &= Lj[y0:y1, x0:x1]
                q = np.nonzero(M)
                if len(q[0]) == 0: continue
                regs.append([float(a), hexc(cf[y0:y1, x0:x1][q].mean(0)[::-1]), o, h])
    regs.sort(key=lambda r: -r[0])
    inks = {}
    Uf = U8.astype(np.float32)
    q_ = P.get('inkq', 12)
    for m_, pct, lo in ((inkm, P.get('inkpct', 40), True), (wink, P.get('winkpct', 60), False)):
        if not m_.any(): continue
        for a, o, h in contours_of(m_, P.get('inkeps', 0.35), P.get('inkarea', 1.0), P.get('inksmooth', 0.4), off):
            M, y0, y1, x0, x1 = poly_mask(mk.shape, o, h, off)
            M &= m_[y0:y1, x0:x1]
            q = np.nonzero(M)
            if len(q[0]) == 0: continue
            v = Uf[y0:y1, x0:x1][q]; lum = v.sum(1)
            sel = (v[lum <= np.percentile(lum, pct)] if lo else v[lum >= np.percentile(lum, pct)]) if pct < 100 else v
            c = (np.round(sel.mean(0)[::-1] / q_) * q_).clip(0, 255)
            inks.setdefault(hexc(c), []).append([o, h])
    return regs, inks


def outline(mask, off, eps=0.8):
    cnts, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    return [cv2.approxPolyDP(c, eps, True).reshape(-1, 2) + np.array(off, float) for c in cnts if cv2.contourArea(c) > 30]


def pack(regs, inks):
    """-> JSON-able [regions [[col, outer, holes...]], inks [[col, [outer, holes...], ...]]] in frame px x2"""
    R = [[r[1], fl(r[2])] + [fl(x) for x in r[3]] for r in regs]
    I = [[c] + [[fl(o)] + [fl(x) for x in h] for o, h in ps] for c, ps in inks.items()]
    return [R, I]


def raster(shape, packed, bg=None, ss=2):
    """preview rasteriser (python): paints packed data at ss x supersampling into a BGR float image (0..255)"""
    H, W = shape
    img = np.zeros((H * ss, W * ss, 3), np.float32) if bg is None else cv2.resize(bg.astype(np.float32), (W * ss, H * ss), interpolation=cv2.INTER_NEAREST)
    R, I = packed
    def pts(p): return np.int32(np.round(np.array(p, float).reshape(-1, 2) / 2 * ss * 16))
    col = lambda c: (int(c[5:7], 16), int(c[3:5], 16), int(c[1:3], 16))
    for r in R:
        c = col(r[0])
        cv2.fillPoly(img, [pts(p) for p in r[1:]], c, lineType=cv2.LINE_AA, shift=4)
        cv2.polylines(img, [pts(r[1])], True, c, 1, lineType=cv2.LINE_AA, shift=4)
    for grp in I:
        c = col(grp[0])
        for ps in grp[1:]:
            cv2.fillPoly(img, [pts(p) for p in ps], c, lineType=cv2.LINE_AA, shift=4)
    return cv2.resize(img, (W, H), interpolation=cv2.INTER_AREA)
