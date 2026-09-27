#!/usr/bin/env python3
# masses.py cfg.json out.json dbg.png — tonal masses for s06 (measurement only; outlines + values, no pixels).
# cfg: {"src": pre.npy, "mask_src": graded.npy, "layers": [layer, ...]}; each layer:
#   {"name", "kind": "wash"|"levels", "box", "include": [poly], "exclude": [[poly, grow]], "lit": {blur, thr, erode},
#    "levels": [..descending..], "blur": px, "bgr": px (wash: dilation of the local ground), "open": px (drop thin
#    strokes), "eps": px, "minarea": px2}
#   wash   = outlines of the local ground (dilated max, blurred) under the strokes: the soft greys (sockets, bags);
#   levels = outlines of the blurred value itself (thick dark masses: lash lines, irises, nostrils).
# Output: {name: [{"v": mean ungraded value in that level band, "rings": [[[x,y]..]..]}, ...]} (fill even-odd, in order).
import cv2, numpy as np, json, sys, os
cfg = json.load(open(sys.argv[1])); out, dbg = sys.argv[2], sys.argv[3]
base = os.path.dirname(os.path.abspath(sys.argv[1]))
P = lambda p: p if os.path.isabs(p) else os.path.join(base, p)
ld = lambda p: (np.load(P(p)) if p.endswith('.npy') else cv2.imread(P(p), 0)).astype(np.float32)
pre = ld(cfg['src']); pre = pre / 255 if pre.max() > 1.01 else pre
H, W = pre.shape
ms = ld(cfg.get('mask_src', cfg['src'])); ms = ms if ms.max() > 1.01 else ms * 255
def poly(pts, grow=0):
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.array(pts, np.int32)], 1)
    if grow: m = cv2.dilate(m, np.ones((2 * grow + 1,) * 2, np.uint8))
    return m
def rings_of(m, eps, mina, smooth=0, minhole=0):
    cs, hier = cv2.findContours(m.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    R = []
    for ci, c in enumerate(cs):
        is_hole = hier is not None and hier[0][ci][3] >= 0
        if abs(cv2.contourArea(c)) < (max(mina, minhole) if is_hole else mina): continue
        c = c[:, 0, :].astype(np.float32)
        if smooth and len(c) > 2 * smooth + 2:
            # moving average along the closed outline (removes the pixel staircase), then simplify
            k = 2 * smooth + 1; ext = np.vstack([c[-smooth:], c, c[:smooth]])
            c = np.stack([np.convolve(ext[:, 0], np.ones(k) / k, 'valid'), np.convolve(ext[:, 1], np.ones(k) / k, 'valid')], 1).astype(np.float32)
        a = cv2.approxPolyDP(c.reshape(-1, 1, 2), eps, True)[:, 0, :]
        if len(a) >= 3: R.append([[round(float(p[0]) * 2) / 2, round(float(p[1]) * 2) / 2] for p in a])
    return R
res = {}
dbgim = cv2.cvtColor((np.clip(pre, 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR) // 2
cols = [(0, 255, 255), (0, 160, 255), (0, 60, 255), (255, 0, 255), (0, 255, 0), (255, 255, 0)]
for Ly in cfg['layers']:
    x0, y0, x1, y1 = Ly['box']
    region = np.zeros((H, W), np.uint8); region[y0:y1, x0:x1] = 1
    if Ly.get('include'):
        inc = np.zeros((H, W), np.uint8)
        for pp in Ly['include']:
            pts, grow = (pp[0], pp[1]) if isinstance(pp[0][0], list) else (pp, 0)
            inc |= poly(pts, grow)
        region &= inc
    if Ly.get('lit'):
        L = Ly['lit']; lm = (cv2.GaussianBlur(ms, (0, 0), L['blur']) > L['thr']).astype(np.uint8)
        if L.get('erode'): lm = cv2.erode(lm, np.ones((2 * L['erode'] + 1,) * 2, np.uint8))
        region &= lm
    for pp in Ly.get('exclude', []):
        pts, grow = (pp[0], pp[1]) if isinstance(pp[0][0], list) else (pp, 0)
        region[poly(pts, grow) > 0] = 0
    # soft exclusions: inside the polygon keep only what is darker than thr (graded 0..255) — e.g. black hair locks
    # crossing a (lighter) brow
    msb = cv2.GaussianBlur(ms, (0, 0), 1.0)
    for pts, thr in Ly.get('exclude_soft', []):
        region[(poly(pts) > 0) & (msb >= thr)] = 0
    g = cv2.GaussianBlur(pre, (0, 0), 1.0)
    if Ly['kind'] == 'wash':
        r = Ly.get('bgr', 15)
        k_ = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (r, r))
        # the ground under the strokes: a morphological closing (max then min) removes dark strokes thinner than r
        # without spreading light regions into dark ones (a plain dilation would put a pale halo round silhouettes)
        morph = Ly.get('morph', 'close' if Ly.get('close', True) else 'dilate')
        # close: drop dark strokes thinner than r (lit surfaces); open: drop bright marks (dots on a dark ground)
        val = cv2.erode(cv2.dilate(g, k_), k_) if morph == 'close' else cv2.dilate(cv2.erode(g, k_), k_) if morph == 'open' else cv2.erode(g, k_) if morph == 'min' else cv2.dilate(g, k_)
        val = cv2.GaussianBlur(val, (0, 0), Ly.get('blur', 4))
    elif Ly.get('space') == 'graded':
        val = cv2.GaussianBlur(ms, (0, 0), Ly.get('blur', 1.0)) / 255
    else:
        val = cv2.GaussianBlur(pre, (0, 0), Ly.get('blur', 1.0))
    valp = cv2.GaussianBlur(pre, (0, 0), Ly.get('blur', 1.0)) if Ly.get('space') == 'graded' else val
    lv = Ly['levels']; items = []
    above = Ly.get('above', False)   # above: nested regions val > l (painted dark to light); else val < l (light to dark)
    for i, l in enumerate(lv):
        m = (((val > l) if above else (val < l)) & (region > 0)).astype(np.uint8)
        k = Ly.get('open', 0)
        if k: m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
        lo = lv[i + 1] if i + 1 < len(lv) else (2 if above else -1)
        band = (m > 0) & ((val <= lo) if above else (val >= lo))
        v = float(np.median(valp[band])) if band.any() else l
        R = rings_of(m, Ly.get('eps', 1.0), Ly.get('minarea', 30), Ly.get('smooth', 0), Ly.get('minhole', 0))
        if R: items.append({'v': round(v, 3), 'l': l, 'rings': R})
        for ring in R: cv2.polylines(dbgim, [np.array(ring, np.int32)], True, cols[i % len(cols)], 1)
    res[Ly['name']] = items
    print(Ly['name'], [(it['v'], len(it['rings']), sum(len(r) for r in it['rings'])) for it in items])
json.dump(res, open(out, 'w'))
bx = cfg.get('dbgbox', [0, 0, W, H])
cv2.imwrite(dbg, cv2.resize(dbgim[bx[1]:bx[3], bx[0]:bx[2]], None, fx=cfg.get('dbgzoom', 1), fy=cfg.get('dbgzoom', 1)))
