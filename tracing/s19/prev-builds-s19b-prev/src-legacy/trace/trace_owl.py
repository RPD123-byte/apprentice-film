# Trace the owl on source key frames (measurement only) into the same layered stroke format as the room:
# posterised base tone outlines + dark strokes + bright strokes, inside the owl's region (its silhouette from the
# background difference, grown by G px so the outline and its shadow are included). The region itself is stored
# as an outline (the layer's clip). Usage: trace_owl.py t1,t2,... out.json [dbg]
import sys, os, json, numpy as np, cv2
from ridges import trace
from render import render
from common import frame, ungrade
from owlmask import src_mask
E = lambda k, d: float(os.environ.get(k, d))
times = [float(t) for t in sys.argv[1].split(',')]; out = sys.argv[2]; dbg = sys.argv[3] if len(sys.argv) > 3 else None
res = {}
for t in times:
    n = int(round(t * 25))
    P = ungrade(frame(n), t)
    if os.environ.get('REGIONS'):       # lift / carry: GrabCut silhouettes seeded by the painted owl (see fidelity/s19.md)
        m = (cv2.imread(f"{os.environ['REGIONS']}/gc-{t:.2f}.png", 0) > 0).astype(np.uint8)
        # GrabCut also takes chunks of the white card next to the white wings: remove the bright, smooth pixels that
        # connect to the region's border (flood from outside through paper; it stops at the owl's dark outline)
        g_ = frame(n).astype(np.float32); gb_ = cv2.GaussianBlur(g_, (0, 0), 1.2)
        lap = np.abs(cv2.Laplacian(gb_, cv2.CV_32F, ksize=3))
        paper = ((gb_ > 175) & (cv2.GaussianBlur(lap, (0, 0), 2) < 6)).astype(np.uint8)
        paper = cv2.erode(paper, np.ones((3, 3), np.uint8))
        grow = cv2.dilate(m, np.ones((5, 5), np.uint8))
        seed = ((grow > 0) & (cv2.erode(m, np.ones((3, 3), np.uint8)) == 0) & (paper > 0)).astype(np.uint8)
        # flood: iterative geodesic dilation of the seed inside paper ∩ region
        allowed = (paper > 0) & (grow > 0); fl = seed.copy()
        for _ in range(200):
            nf = cv2.dilate(fl, np.ones((3, 3), np.uint8)) & allowed.astype(np.uint8)
            if (nf == fl).all(): break
            fl = nf
        m = (m & (1 - fl)).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
        nn, lab, st, _ = cv2.connectedComponentsWithStats(m)
        if nn > 1: m = (lab == 1 + np.argmax(st[1:, 4])).astype(np.uint8)
    else: m = src_mask(t)
    G = int(E('GROW', 10))
    reg = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * G + 1, 2 * G + 1)))
    H, W = P.shape
    # clip outline (outer contour of the region)
    cs, _ = cv2.findContours(reg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea); clip = cv2.approxPolyDP(c, 1.0, True)[:, 0, :].astype(float) + 0.5
    reg = np.zeros_like(reg); cv2.drawContours(reg, [c], -1, 1, -1)     # the region is the clip: no enclosed bays
    x0, y0, bw, bh = cv2.boundingRect(c)
    sub = (slice(max(0, y0 - 20), min(H, y0 + bh + 20)), slice(max(0, x0 - 20), min(W, x0 + bw + 20)))
    mk = np.zeros((H, W), np.float32); mk[sub] = reg[sub]
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(E('OPEN', 7)),) * 2)
    # base tone: inside the owl a closing (the white plumage without its dark strokes), outside it an opening (the
    # dark room without its white strokes); blended across the silhouette edge
    kc = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(E('CLOSE', 7)),) * 2)
    inner = cv2.GaussianBlur(cv2.erode(m, np.ones((5, 5), np.uint8)).astype(np.float32), (0, 0), 2.0)
    base = cv2.morphologyEx(P, cv2.MORPH_CLOSE, kc) * inner + cv2.morphologyEx(P, cv2.MORPH_OPEN, k) * (1 - inner)
    base = cv2.GaussianBlur(base, (0, 0), E('BBLUR', 2.0)) * mk
    STEP = E('STEP', 0.04); B = []
    for lv in np.arange(STEP * 1.5, 1.0, STEP):
        mm = (base > lv).astype(np.uint8)
        m4 = cv2.resize(mm[sub], (mm[sub].shape[1] * 4, mm[sub].shape[0] * 4), interpolation=cv2.INTER_NEAREST)
        cs2, _ = cv2.findContours(m4, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
        rings = []
        for cc in cs2:
            if abs(cv2.contourArea(cc)) < 12 * 16: continue
            a = cv2.approxPolyDP(cc, E('EPS', 0.9) * 4, True)[:, 0, :]
            if len(a) >= 3: rings.append(np.round((a + 0.5) / 4 + [sub[1].start, sub[0].start], 2).tolist())
        if rings: B.append([round(float(lv + STEP / 2), 3), rings])
    lit = (cv2.GaussianBlur(base, (0, 0), 2) > 0.16).astype(np.uint8) * mk.astype(np.uint8)
    dark = trace(P, lit, polarity=-1, sigmas=(0.8, 1.2, 1.8, 2.6), hi=E('DHI', 0.04), lo=E('DLO', 0.015), minlen=5, psf=0.7)
    bright = trace(P, mk, polarity=1, sigmas=(0.8, 1.2, 1.8, 2.6), hi=E('HI', 0.03), lo=E('LO', 0.012), minlen=5, psf=0.7, basemap=base)
    # the tracer under-reads thin dark lines (softness, spine smoothing): deepen every dark stroke below its local
    # base tone by DGAIN (1.3 minimised the region error on 59.36 and 60.76, σ 1.5 and 4)
    bo = render({'base': B}, psf=0)
    g_ = E('DGAIN', 1.3)
    dark = [[[x, y, w, round(max(0.0, (bo[min(H - 1, int(y)), min(W - 1, int(x))] - (bo[min(H - 1, int(y)), min(W - 1, int(x))] - v) * g_) if v < bo[min(H - 1, int(y)), min(W - 1, int(x))] else v), 3)] for x, y, w, v in s_] for s_ in dark]
    lay = {'clip': np.round(clip, 1).tolist(), 'base': B, 'dark': dark, 'bright': bright}
    res[f'{t:.2f}'] = lay
    R = render(lay)
    msk = mk > 0
    br = cv2.GaussianBlur(R * mk, (0, 0), 4); bs = cv2.GaussianBlur(P * mk, (0, 0), 4)
    print(t, 'rings', sum(len(r) for _, r in B), 'dark', len(dark), 'bright', len(bright), 'MAE(σ4, region)', round(float(np.abs(br - bs)[msk].mean() * 255), 2), 'region px', int(msk.sum()), flush=True)
    if dbg:
        im = np.hstack([np.clip(R[sub] * 255, 0, 255), np.clip(P[sub] * 255, 0, 255)]).astype(np.uint8)
        cv2.imwrite(f'{dbg}-{t:.2f}.png', im)
json.dump(res, open(out, 'w'))
print('json MB', round(len(open(out).read()) / 1e6, 3))
