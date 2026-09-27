# Lower card corners during the lift from the paper's visible edges (measurement only). For each frame: the paper's
# bottom edge is found column by column right of the owl (GrabCut silhouette, grown 12 px) as the bright→dark
# transition below the card's text box; the right edge row by row the same way; the left edge from the keyline
# (linemeas.refine on the upper homography's prediction). Lines are fitted robustly; BR = right ∩ bottom,
# BL = left ∩ bottom; the lower quad is [TL_up, TR_up, BR, BL]. Writes rows [t, upper 8, lower 8].
import sys, json, re, numpy as np, cv2
import linemeas as LM
from common import frame
CW, CH = 465, 648
s = open('/Users/computer/rootline/apprentice-film/src/shots/s19/card.js').read()
TAB = {round(float(t), 2): np.array([float(v) for v in r.replace('  ', ' ').split(',')]) for t, r in re.findall(r'\[(\d\d\.\d\d), ([^\]]+)\]', s[s.index('CARD_TAB'):])}
GC = '/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-dev'
def fitline(P):
    P = np.array(P, float); keep = np.ones(len(P), bool)
    for _ in range(5):
        m = P[keep].mean(0); U, S, Vt = np.linalg.svd(P[keep] - m); d = Vt[0]; n = np.array([-d[1], d[0]])
        r = np.abs((P - m) @ n); thr = max(1.5, 2.5 * np.median(r[keep])); keep = r < thr
    return m, d, float(np.sqrt(np.mean(r[keep] ** 2))), int(keep.sum())
def inter(m1, d1, m2, d2):
    A = np.array([d1, -d2]).T; st = np.linalg.solve(A, m2 - m1); return m1 + d1 * st[0]
def crossing(prof, lo=150, hi=190):
    # first index where the profile goes from paper (>hi) to dark (<lo); sub-pixel at the midpoint level
    for i in range(1, len(prof)):
        if prof[i - 1] > hi and prof[i] < hi:
            j = i
            while j < len(prof) and prof[j] > lo: j += 1
            if j >= len(prof): return None
            a, b = prof[i - 1], prof[j]; lv = (a + b) / 2
            k = i - 1
            while k < j and prof[k + 1] > lv: k += 1
            f = (prof[k] - lv) / (prof[k] - prof[k + 1] + 1e-9); return k + f
    return None
out = []
for t in [float(v) for v in sys.argv[1].split(',')]:
    r = TAB[round(t, 2)]; up = r[0:8].reshape(4, 2); Hup = LM.Hq(up)
    g = cv2.GaussianBlur(frame(int(round(t * 25))).astype(np.float32), (0, 0), 1.0)
    owl = cv2.imread(f'{GC}/gc-{t:.2f}.png', 0); owl = cv2.dilate((owl > 0).astype(np.uint8), np.ones((25, 25), np.uint8))
    # bottom edge: scan columns downward from the upper-H point at v = 560
    B = []
    for u in np.linspace(40, 405, 74):          # clear of the rounded corners (r 45)
        p0 = LM.ph(Hup, np.array([[u, 560.0]]))[0]; p1 = LM.ph(Hup, np.array([[u, 760.0]]))[0]
        n = int(np.hypot(*(p1 - p0))); 
        if n < 10: continue
        xs = np.linspace(p0[0], p1[0], n); ys = np.linspace(p0[1], p1[1], n)
        ok = (xs > 2) & (xs < 2203) & (ys > 2) & (ys < 943)
        if not ok.all(): continue
        ow = owl[ys.astype(int), xs.astype(int)] > 0
        prof = g[ys.astype(int), xs.astype(int)]
        # start the scan below the owl if it covers the top of the path
        st = 0
        while st < n and ow[st]: st += 1
        c = crossing(prof[st:])
        if c is None: continue
        c += st
        if ow[int(c):min(n, int(c) + 12)].any(): continue       # the edge found must not touch the owl
        B.append((xs[0] + (xs[-1] - xs[0]) * c / (n - 1), ys[0] + (ys[-1] - ys[0]) * c / (n - 1)))
    R = []
    for v in np.linspace(200, 580, 77):
        p0 = LM.ph(Hup, np.array([[380.0, v]]))[0]; p1 = LM.ph(Hup, np.array([[560.0, v]]))[0]
        n = int(np.hypot(*(p1 - p0)))
        if n < 10: continue
        xs = np.linspace(p0[0], p1[0], n); ys = np.linspace(p0[1], p1[1], n)
        if not ((xs > 2) & (xs < 2203) & (ys > 2) & (ys < 943)).all(): continue
        ow = owl[ys.astype(int), xs.astype(int)] > 0
        st = 0
        while st < n and ow[st]: st += 1
        c = crossing(g[ys.astype(int), xs.astype(int)][st:])
        if c is None: continue
        c += st
        if ow[int(c):min(n, int(c) + 12)].any(): continue
        R.append((xs[0] + (xs[-1] - xs[0]) * c / (n - 1), ys[0] + (ys[-1] - ys[0]) * c / (n - 1)))
    Ls = LM.model_seg('pL'); P = LM.ph(Hup, np.array(Ls, float)); cs = LM.clip_seg(P[0], P[1])
    Lr = LM.refine(g, (*cs[0], *cs[1]), R=6, inner=LM.inner_dir(up, 'pL', (*cs[0], *cs[1])), kind='paper') if cs is not None else None
    info = {'B': len(B), 'R': len(R), 'L': 0 if Lr is None else len(Lr[0])}
    lo = r[8:16].reshape(4, 2).copy()
    if len(B) >= 6 and len(R) >= 5 and Lr is not None:
        mb, db, eb, nb = fitline(B); mr, dr, er, nr = fitline(R); ml, dl, el, nl = fitline(Lr[0])
        BR = inter(mr, dr, mb, db); BL = inter(ml, dl, mb, db)
        lo = np.array([up[0], up[1], BR, BL]); info.update(rmsB=round(eb, 2), rmsR=round(er, 2), rmsL=round(el, 2))
        ok = True
    else: ok = False
    out.append([t] + [round(float(v), 1) for v in up.ravel()] + [round(float(v), 1) for v in lo.ravel()])
    print(t, 'ok' if ok else 'KEEP', info, 'BR', np.round(lo[2], 1).tolist(), 'BL', np.round(lo[3], 1).tolist(), 'old BR', np.round(r[12:14], 1).tolist(), 'old BL', np.round(r[14:16], 1).tolist(), flush=True)
    img = frame(int(round(t * 25)), gray=False)
    for q, col in ((lo, (0, 255, 0)), (r[8:16].reshape(4, 2), (0, 0, 255))):
        cv2.polylines(img, [np.round(np.clip(q, -3000, 5000)).astype(np.int32)], True, col, 2)
    for p in B + R: cv2.circle(img, (int(p[0]), int(p[1])), 3, (255, 0, 255), -1)
    cv2.imwrite(f'/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-ref/kc/ef-{t:.2f}.jpg', cv2.resize(img[300:946, 900:2206], None, fx=0.5, fy=0.5))
json.dump(out, open(sys.argv[2], 'w'))
