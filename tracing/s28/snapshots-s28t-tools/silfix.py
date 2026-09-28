# s28t: refine an orbit figure key's silhouette on its SOURCE frame (measurement): the figure is everything the room
# cannot reach without crossing ink. Flood from outside dilate(old sil, R) over non-ink pixels; what the flood does not
# reach (and lies inside that dilation, outside the lid) is figure; thin room spurs are removed.
# Usage: silfix.py T [R] [--vis out.jpg]  -> prints stats, writes snapshots/s28t-tools/sil/<name>.json
import sys, os, json, subprocess, numpy as np, cv2
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28t-tools')
from m import frame, SRC
W, H = 2206, 946
ROOT = '/Users/computer/rootline/apprentice-film'
Q = json.load(open(f'{ROOT}/snapshots/s28t-tools/t/lidquads.json'))
def key(name):
    subprocess.run(['node', f'{ROOT}/snapshots/s28t-tools/keyras.mjs', name, '/tmp/s28t_k.json'], check=True)
    return json.load(open('/tmp/s28t_k.json'))
def mask_of(rings, pad=0):
    m = np.zeros((H + 2 * pad, W + 2 * pad), np.uint8)
    for r in rings: cv2.fillPoly(m, [np.int32(np.round(np.array(r) + pad))], 255)
    return m
def disk(r): return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
def lidmask(t, pad):
    q = Q[f"{min(t, 131.40):.2f}"]
    p = [[q[0][0] - pad, q[0][1] - pad], [q[1][0] + pad, q[1][1] - pad], [q[2][0] + pad, q[2][1] + 80], [q[3][0] - pad, q[3][1] + 80]]
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.int32(p)], 255); return m
def refine(t, R=45, lmax=0.42, contrast=0.10, extra_cut=(), extra_add=(), GAP=3, LIDBAR=14, seals=(), SEEDR=90):
    name = ('fig' if t < 131.4 else 'lock') + str(int(round(t * 100)))
    K = key(name)
    S0 = mask_of(K['sil'])
    f = frame(SRC, round(t * 25)).astype(np.float32) / 255
    L = cv2.GaussianBlur(0.114 * f[..., 0] + 0.587 * f[..., 1] + 0.299 * f[..., 2], (0, 0), 0.8)
    bg = cv2.GaussianBlur(cv2.dilate(L, disk(5)), (0, 0), 3)
    ink = ((L < lmax) & ((bg - L) > contrast)) | (L < 0.18)
    ink = ink.astype(np.uint8) * 255
    ink = cv2.dilate(ink, disk(1))                          # seal 1-2 px gaps in the outline
    lid = lidmask(t, 5)
    zone = cv2.dilate(S0, disk(R))
    free = ((ink == 0) & (lidmask(t, LIDBAR) == 0)).astype(np.uint8)
    for a, b in seals:                                     # measured seal lines where the outline has a gap
        cv2.line(free, tuple(map(int, a)), tuple(map(int, b)), 0, 3)
    # flood from outside the zone (and the frame's outer border) through free pixels
    # flood on the free space eroded by GAP px (so the flood cannot squeeze through gaps in the outline narrower than
    # 2*GAP+1 px), then grow what it reached back by GAP px inside the free space
    fe = cv2.erode(free, disk(GAP)) if GAP > 0 else free
    # seeds: the frame border away from him, and pixels far outside the old outline (it misses chunks up to ~60 px)
    far = cv2.dilate(S0, disk(SEEDR)) == 0
    bord = np.zeros((H, W), bool); bord[:2, :] = bord[-2:, :] = True; bord[:, :2] = bord[:, -2:] = True
    bord &= cv2.dilate(S0, disk(12)) == 0
    seed = ((far | bord) & (fe > 0)).astype(np.uint8)
    n, lab = cv2.connectedComponents(fe, connectivity=4)
    reached = (np.isin(lab, np.unique(lab[seed > 0])) & (fe > 0)).astype(np.uint8)
    if GAP > 0: reached = cv2.dilate(reached, disk(GAP)) & free
    reached = reached > 0
    fig = ((zone > 0) & ~reached & (lid == 0)).astype(np.uint8) * 255
    # remove thin spurs (room ink lines touching him): keep what lies near the opened body
    body = cv2.morphologyEx(fig, cv2.MORPH_OPEN, disk(7))
    fig &= cv2.dilate(body, disk(5))
    for p in extra_cut: cv2.fillPoly(fig, [np.int32(p)], 0)
    for p in extra_add: cv2.fillPoly(fig, [np.int32(p)], 255)
    # the component(s) that overlap his core (enclosed room pockets beside him are dropped) + holes filled
    core = cv2.erode(S0, disk(25)) > 0
    n_, lab_ = cv2.connectedComponents(fig)
    keep = [i for i in np.unique(lab_[core & (fig > 0)]) if i > 0]
    fig = np.isin(lab_, keep).astype(np.uint8) * 255
    cs, _ = cv2.findContours(fig, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    fill = np.zeros_like(fig); cv2.drawContours(fill, cs, -1, 255, -1)
    fill[lid > 0] = 0
    fill = cv2.morphologyEx(fill, cv2.MORPH_OPEN, disk(2))
    return name, K, S0, fill, ink
if __name__ == '__main__':
    t = float(sys.argv[1]); R = int(sys.argv[2]) if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else 45
    GAP = int(sys.argv[sys.argv.index('--gap') + 1]) if '--gap' in sys.argv else 3
    name, K, S0, S1, ink = refine(t, R, GAP=GAP)
    add = (S1 > 0) & (S0 == 0); rem = (S0 > 0) & (S1 == 0)
    print(name, 'old', int((S0 > 0).sum()), 'new', int((S1 > 0).sum()), 'added', int(add.sum()), 'removed', int(rem.sum()))
    if '--vis' in sys.argv:
        f = frame(SRC, round(t * 25)).copy()
        o = f.copy(); o[add] = (0.5 * o[add] + [0, 127, 0]).astype(np.uint8); o[rem] = (0.5 * o[rem] + [127, 0, 127]).astype(np.uint8)
        cs, _ = cv2.findContours(S1, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(o, cs, -1, (0, 255, 0), 1)
        cv2.imwrite(sys.argv[sys.argv.index('--vis') + 1], o)
def reachvis(t, out, **kw):
    name, K, S0, S1, ink = refine(t, **kw)
    f = frame(SRC, round(t * 25)).copy()
    add = (S1 > 0) & (S0 == 0); rem = (S0 > 0) & (S1 == 0)
    o = f.copy(); o[add] = (0.4 * o[add] + [0, 150, 0]).astype(np.uint8); o[rem] = (0.4 * o[rem] + [150, 0, 150]).astype(np.uint8)
    o[ink > 0] = (0, 0, 255)
    cs, _ = cv2.findContours(S1, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(o, cs, -1, (0, 255, 0), 2)
    cv2.imwrite(out, o)
    return S0, S1
def refine_gc(t, R=80, iters=6, ylim=None, **kw):
    """GrabCut on the source frame, seeded by the old outline and the outside flood (see refine)."""
    name, K, S0, S1, ink = refine(t, R=R, **kw)
    f = frame(SRC, round(t * 25))
    lid = lidmask(t, 5)
    # recompute the flood reach (as refine does) for the background hint
    free = ((ink == 0) & (lidmask(t, kw.get('LIDBAR', 14)) == 0)).astype(np.uint8)
    fe = cv2.erode(free, disk(kw.get('GAP', 3)))
    far = cv2.dilate(S0, disk(kw.get('SEEDR', 90))) == 0
    bord = np.zeros((H, W), bool); bord[:2, :] = bord[-2:, :] = True; bord[:, :2] = bord[:, -2:] = True
    bord &= cv2.dilate(S0, disk(12)) == 0
    seed = ((far | bord) & (fe > 0))
    n, lab = cv2.connectedComponents(fe, connectivity=4)
    reached = (np.isin(lab, np.unique(lab[seed])) & (fe > 0)).astype(np.uint8)
    reached = cv2.dilate(reached, disk(kw.get('GAP', 3))) & free
    m = np.full((H, W), cv2.GC_PR_BGD, np.uint8)
    m[(S0 > 0) | (S1 > 0)] = cv2.GC_PR_FGD
    m[(reached > 0) & (cv2.dilate(S0, disk(12)) == 0)] = cv2.GC_BGD
    m[cv2.dilate(S0, disk(R + 10)) == 0] = cv2.GC_BGD
    m[cv2.erode(S0, disk(35)) > 0] = cv2.GC_FGD
    m[lid > 0] = cv2.GC_BGD
    bgd = np.zeros((1, 65), np.float64); fgd = np.zeros((1, 65), np.float64)
    cv2.grabCut(f, m, None, bgd, fgd, iters, cv2.GC_INIT_WITH_MASK)
    g = np.isin(m, [cv2.GC_FGD, cv2.GC_PR_FGD]).astype(np.uint8) * 255
    g = cv2.morphologyEx(g, cv2.MORPH_OPEN, disk(3))
    core = cv2.erode(S0, disk(25)) > 0
    n_, lab_ = cv2.connectedComponents(g)
    keep = [i for i in np.unique(lab_[core & (g > 0)]) if i > 0]
    g = np.isin(lab_, keep).astype(np.uint8) * 255
    cs, _ = cv2.findContours(g, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    fill = np.zeros_like(g); cv2.drawContours(fill, cs, -1, 255, -1); fill[lid > 0] = 0
    if ylim is not None:
        fill[ylim:] = S0[ylim:]
    return name, K, S0, fill, ink
def gcvis(t, out, **kw):
    name, K, S0, S1, ink = refine_gc(t, **kw)
    f = frame(SRC, round(t * 25)).copy()
    add = (S1 > 0) & (S0 == 0); rem = (S0 > 0) & (S1 == 0)
    o = f.copy(); o[add] = (0.4 * o[add] + [0, 150, 0]).astype(np.uint8); o[rem] = (0.4 * o[rem] + [150, 0, 150]).astype(np.uint8)
    cs, _ = cv2.findContours(S1, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(o, cs, -1, (0, 255, 0), 2)
    cv2.imwrite(out, o)
    return S0, S1
def contours_vis(t, S0, S1, out, scale=0.6, box=None):
    f = frame(SRC, round(t * 25)).copy()
    cs, _ = cv2.findContours(S0, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE); cv2.drawContours(f, cs, -1, (255, 0, 255), 2)
    cs, _ = cv2.findContours(S1, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE); cv2.drawContours(f, cs, -1, (0, 255, 0), 2)
    if box: x0, y0, x1, y1 = box; f = f[y0:y1, x0:x1]
    cv2.imwrite(out, cv2.resize(f, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA))
def gridvis(t, S0, S1, out, box, step=50, scale=1.0, extra=None):
    f = frame(SRC, round(t * 25)).copy()
    x0, y0, x1, y1 = box
    for x in range((x0 // step) * step, x1, step):
        cv2.line(f, (x, y0), (x, y1), (0, 200, 255), 1); cv2.putText(f, str(x), (x + 2, y0 + 14), 0, 0.45, (0, 255, 255), 1)
    for y in range((y0 // step) * step, y1, step):
        cv2.line(f, (x0, y), (x1, y), (0, 200, 255), 1); cv2.putText(f, str(y), (x0 + 2, y - 3), 0, 0.45, (0, 255, 255), 1)
    if S0 is not None:
        cs, _ = cv2.findContours(S0, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE); cv2.drawContours(f, cs, -1, (255, 0, 255), 1)
    if S1 is not None:
        cs, _ = cv2.findContours(S1, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE); cv2.drawContours(f, cs, -1, (0, 255, 0), 1)
    if extra:
        for p in extra: cv2.polylines(f, [np.int32(p)], True, (255, 255, 0), 1)
    f = f[y0:y1, x0:x1]
    cv2.imwrite(out, cv2.resize(f, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC))
