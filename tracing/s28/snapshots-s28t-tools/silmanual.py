# s28t: the hand-checked fixes applied to sil_new.json after mksil.py (run once, in this order, from the project root;
# kept here so the silhouettes can be rebuilt): mksil.py -> silmanual.py elbow -> silmanual.py beanie
#   elbow : at 130.52 the lid cuts the elbow off him; GrabCut seeded inside that piece adds it as a second ring
#   beanie: at 129.92-130.32 the beanie's lit right edge (as pale as the window) was left out; flood-and-close in a local
#           box (129.92), then a convex fill of the beanie's right side between y 150 and ~335 (130.12, 130.32)
import sys, json, os, numpy as np, cv2
os.chdir('/Users/computer/rootline/apprentice-film'); sys.path.insert(0, 'snapshots/s28t-tools')
from silfix import frame, SRC, lidmask, disk, mask_of, H, W
P = 'snapshots/s28t-tools/sil_new.json'
SN = json.load(open(P))
def rings_of(V):
    cs, _ = cv2.findContours(V, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    r = [cv2.approxPolyDP(c.astype(np.float32), 1.0, True).reshape(-1, 2).tolist() for c in sorted(cs, key=cv2.contourArea, reverse=True) if cv2.contourArea(c) >= 1500]
    return r if len(r) > 1 else r[0]
def as_list(r): return [r] if isinstance(r[0][0], (int, float)) else r
if 'elbow' in sys.argv[1:]:
    t = 130.52; f = frame(SRC, round(t * 25))
    m = np.full((H, W), cv2.GC_BGD, np.uint8); m[520:800, 280:420] = cv2.GC_PR_BGD
    cv2.fillPoly(m, [np.int32([[330, 700], [380, 600], [395, 600], [395, 760], [335, 760]])], cv2.GC_PR_FGD)
    cv2.circle(m, (370, 700), 15, cv2.GC_FGD, -1); m[lidmask(t, 3) > 0] = cv2.GC_BGD
    cv2.grabCut(f, m, None, np.zeros((1, 65)), np.zeros((1, 65)), 8, cv2.GC_INIT_WITH_MASK)
    g = np.isin(m, [1, 3]).astype(np.uint8) * 255
    n, lab, st, _ = cv2.connectedComponentsWithStats(g); g = (lab == 1 + np.argmax(st[1:, 4])).astype(np.uint8) * 255
    g = cv2.dilate(g, np.ones((3, 3), np.uint8))
    cs, _ = cv2.findContours(g, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    SN['130.52'] = [as_list(SN['130.52'])[0], cv2.approxPolyDP(max(cs, key=cv2.contourArea).astype(np.float32), 1.0, True).reshape(-1, 2).tolist()]
if 'beanie' in sys.argv[1:]:
    BOX = {129.92: (1320, 120, 1620, 420), 130.12: (1350, 120, 1650, 420), 130.32: (1380, 120, 1680, 420)}
    for t, (x0, y0, x1, y1) in BOX.items():
        S1 = mask_of(as_list(SN[f'{t:.2f}']))
        f = frame(SRC, round(t * 25)).astype(np.float32) / 255
        L = cv2.GaussianBlur(0.114 * f[..., 0] + 0.587 * f[..., 1] + 0.299 * f[..., 2], (0, 0), 0.8)
        bg = cv2.GaussianBlur(cv2.dilate(L, disk(5)), (0, 0), 3)
        ink = cv2.dilate((((L < 0.42) & ((bg - L) > 0.10)) | (L < 0.18)).astype(np.uint8), disk(1))
        free = (ink == 0).astype(np.uint8); fe = cv2.erode(free, disk(2))
        seed = (cv2.dilate(S1, disk(60)) == 0) & (fe > 0)
        n, lab = cv2.connectedComponents(fe, connectivity=4)
        reached = cv2.dilate((np.isin(lab, np.unique(lab[seed])) & (fe > 0)).astype(np.uint8), disk(2)) & free
        reg = np.zeros_like(S1); reg[y0:y1, x0:x1] = 255
        U = S1.copy(); U[(reached == 0) & (cv2.dilate(S1, disk(30)) > 0) & (reg > 0)] = 255
        U = cv2.morphologyEx(U, cv2.MORPH_OPEN, disk(2))
        V = U | (cv2.morphologyEx(U, cv2.MORPH_CLOSE, disk(12)) & reg)
        cs, _ = cv2.findContours(V, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        F = np.zeros_like(V); cv2.drawContours(F, cs, -1, 255, -1)
        n, lab, st, _ = cv2.connectedComponentsWithStats(((F > 0) & (V == 0)).astype(np.uint8))
        for i in range(1, n):
            if st[i, 4] < 6000: V[lab == i] = 255
        if t in (130.12, 130.32):
            bx0, by0, bx1, by1 = {130.12: (1400, 150, 1650, 335), 130.32: (1430, 150, 1680, 340)}[t]
            sub = np.zeros_like(V); sub[by0:by1, bx0:bx1] = V[by0:by1, bx0:bx1]
            Hm = np.zeros_like(V); cv2.fillPoly(Hm, [cv2.convexHull(cv2.findNonZero(sub))], 255)
            Hm[:by0] = 0; Hm[by1:] = 0; Hm[:, :bx0] = 0; Hm[:, bx1:] = 0; V |= Hm
        SN[f'{t:.2f}'] = rings_of(V)
json.dump(SN, open(P, 'w'))
