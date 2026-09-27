# The lifted card's sagging bottom-right corner, per frame (measurement only): the paper's right edge (last bright
# pixel per row) and bottom edge (last bright pixel per column) near the corner, the owl (GrabCut silhouette, grown)
# excluded, each fitted with a line away from the rounded corner (≥ 55 px from it), intersected -> the sharp corner
# of the paper outline. Prints the corner and the offset from the upper homography's BR.
import sys, json, re, numpy as np, cv2
from common import frame
s = open('/Users/computer/rootline/apprentice-film/src/shots/s19/card.js').read()
TAB = {round(float(t), 2): np.array([float(v) for v in r.replace('  ', ' ').split(',')]) for t, r in re.findall(r'\[(\d\d\.\d\d), ([^\]]+)\]', s[s.index('CARD_TAB'):])}
GC = '/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-dev'
def fit(P, a_is_y):
    # x = a*y + b (right edge) or y = a*x + b (bottom edge), robust
    P = np.array(P, float); keep = np.ones(len(P), bool)
    for _ in range(6):
        X = P[keep, 1] if a_is_y else P[keep, 0]; Y = P[keep, 0] if a_is_y else P[keep, 1]
        a, b = np.polyfit(X, Y, 1)
        r = (P[:, 0] - (a * P[:, 1] + b)) if a_is_y else (P[:, 1] - (a * P[:, 0] + b))
        keep = np.abs(r) < max(1.5, 2.5 * np.median(np.abs(r[keep])))
    return a, b, float(np.sqrt(np.mean(r[keep] ** 2))), int(keep.sum())
res = {}; prev_off = np.zeros(2)
for t in [float(v) for v in sys.argv[1].split(',')]:
    up = TAB[round(t, 2)][0:8].reshape(4, 2); br0 = up[2] + prev_off; brU = up[2]
    g = cv2.GaussianBlur(frame(int(round(t * 25))).astype(np.float32), (0, 0), 1.0)
    owl = cv2.dilate((cv2.imread(f'{GC}/gc-{t:.2f}.png', 0) > 0).astype(np.uint8), np.ones((15, 15), np.uint8))
    H, W = g.shape
    Rp = []; Bp = []
    for y in range(int(max(5, br0[1] - 260)), int(min(H - 5, br0[1] + 260)), 4):
        row = g[y]; br = np.nonzero(row[:W - 3] > 185)[0]
        if not len(br): continue
        x = br.max()
        if x >= W - 6 or owl[y, max(0, x - 3):x + 4].any(): continue
        Rp.append((x + 0.5, y))
    for x in range(int(max(5, br0[0] - 420)), int(min(W - 5, br0[0] + 150)), 4):
        col = g[:H - 3, x]; br = np.nonzero(col > 185)[0]
        if not len(br): continue
        y = br.max()
        if y >= H - 6 or owl[max(0, y - 3):y + 4, x].any(): continue
        Bp.append((x, y + 0.5))
    if len(Rp) < 8 or len(Bp) < 8: print(t, 'too few', len(Rp), len(Bp)); continue
    Rp = np.array(Rp); Bp = np.array(Bp)
    # iterate: corner estimate -> keep points away from it -> refit
    cx, cy = br0
    for it in range(4):
        r_ = Rp[(Rp[:, 1] < cy - 55) & (Rp[:, 1] > cy - 260) & (np.abs(Rp[:, 0] - cx) < 200)]
        b_ = Bp[(Bp[:, 0] < cx - 55) & (Bp[:, 0] > cx - 420) & (np.abs(Bp[:, 1] - cy) < 200)]
        if len(r_) < 6 or len(b_) < 6: break
        ar, brr, er, nr = fit(r_, True); ab, bb, eb, nb = fit(b_, False)
        # x = ar*y + brr ; y = ab*x + bb
        y = (ab * brr + bb) / (1 - ab * ar); x = ar * y + brr
        cx, cy = x, y
    else:
        pass
    if len(r_) < 6 or len(b_) < 6: print(t, 'fit failed', len(r_), len(b_)); continue
    res[f'{t:.2f}'] = [round(float(cx), 1), round(float(cy), 1)]
    prev_off = np.array([cx, cy]) - brU
    print(t, 'corner', round(float(cx), 1), round(float(cy), 1), 'offset', round(float(cx - brU[0]), 1), round(float(cy - brU[1]), 1), 'right rms', round(er, 2), nr, 'slope', round(ar, 3), 'bottom rms', round(eb, 2), nb, 'slope', round(ab, 3), flush=True)
json.dump(res, open(sys.argv[2], 'w'))
