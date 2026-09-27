# Owl silhouette on a lift/carry frame (measurement only): the expected background is the source room (57.32/57.36
# and 63.08 composite, graded) with the source's own standing card (57.36, rectified) warped by the measured card
# map (s19/card.js CARD_TAB: two homographies blended by v) over it; the owl is where the frame differs, holes filled.
import sys, json, re, numpy as np, cv2
from common import frame, W, H
CW, CH = 465, 648
def card_tab():
    s = open('/Users/computer/rootline/apprentice-film/src/shots/s19/card.js').read()
    rows = re.findall(r'\[(\d\d\.\d\d), ([^\]]+)\]', s[s.index('CARD_TAB'):])
    return {round(float(t), 2): np.array([float(v) for v in r.replace('  ', ' ').split(',')]) for t, r in rows}
TAB = card_tab()
def Hq(q):
    return cv2.getPerspectiveTransform(np.float32([[0, 0], [CW, 0], [CW, CH], [0, CH]]), np.float32(q).reshape(4, 2)).astype(np.float64)
QS = np.float32([[1093.2, 86.9], [1578.4, 50.7], [1686.5, 802.5], [995.7, 774.1]])
gA = np.mean([frame(1433), frame(1434)], 0).astype(np.float32); gB = frame(1577).astype(np.float32)
def room():
    yy, xx = np.mgrid[0:H, 0:W]
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.round(QS * 4).astype(np.int32)], 1, shift=2)
    dA = cv2.distanceTransform(1 - m, cv2.DIST_L2, 5)
    nrm = np.array([1, -0.76]) / np.hypot(1, 0.76); dB = -((xx - 1613) * nrm[0] + yy * nrm[1])
    owlB = (xx > 1880) & (yy > 330) & (yy < 800)
    return np.where((dB > dA) & (dB > 25) & ~owlB, gB, gA)
ROOM = room()
# rectified source card at 2 px / unit with a 40-unit margin (includes the glow)
K, M = 2, 40
Tc = np.array([[1 / K, 0, -M], [0, 1 / K, -M], [0, 0, 1]])
CARD = cv2.warpPerspective(gA, Hq(QS) @ Tc, ((CW + 2 * M) * K, (CH + 2 * M) * K), flags=cv2.WARP_INVERSE_MAP | cv2.INTER_LINEAR)
def expected(t):
    r = TAB[round(t, 2)]; H1 = Hq(r[0:8]); H2 = Hq(r[8:16])
    # forward mesh: map each frame pixel back is hard for a blended map; sample forward on a dense grid instead
    us = np.linspace(-M, CW + M, (CW + 2 * M) * K // 2); vs = np.linspace(-M, CH + M, (CH + 2 * M) * K // 2)
    U, V = np.meshgrid(us, vs)
    def ph(Hm):
        p = np.stack([U, V, np.ones_like(U)], -1) @ Hm.T; return p[..., :2] / p[..., 2:3]
    w = np.clip((V - 300) / 250, 0, 1); w = w * w * (3 - 2 * w)
    P = ph(H1) * (1 - w[..., None]) + ph(H2) * w[..., None]
    # splat by remap: build the inverse map with a coarse grid warp (cv2.remap from frame to card coords via griddata)
    from scipy.interpolate import griddata
    ys, xs = np.mgrid[0:H:4, 0:W:4]
    inv_u = griddata(P.reshape(-1, 2), U.ravel(), (xs, ys), method='linear'); inv_v = griddata(P.reshape(-1, 2), V.ravel(), (xs, ys), method='linear')
    inv_u = cv2.resize(inv_u.astype(np.float32), (W, H), interpolation=cv2.INTER_LINEAR); inv_v = cv2.resize(inv_v.astype(np.float32), (W, H), interpolation=cv2.INTER_LINEAR)
    cu = (inv_u + M) * K; cv_ = (inv_v + M) * K
    valid = np.isfinite(cu) & np.isfinite(cv_)
    card = cv2.remap(CARD, np.nan_to_num(cu, nan=-1).astype(np.float32), np.nan_to_num(cv_, nan=-1).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=-1)
    inside = valid & (inv_u > -M + 2) & (inv_u < CW + M - 2) & (inv_v > -M + 2) & (inv_v < CH + M - 2) & (card >= 0)
    return np.where(inside, card, ROOM), inside
def mask(t, thr=40, close=21):
    E, ins = expected(t)
    g = frame(int(round(t * 25))).astype(np.float32)
    d = cv2.GaussianBlur(np.abs(g - E), (0, 0), 2.5)
    m = (d > thr).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close, close)))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n > 1:
        k = 1 + np.argmax(st[1:, 4]); m = (lab == k).astype(np.uint8)
    ff = m.copy(); msk = np.zeros((H + 2, W + 2), np.uint8); cv2.floodFill(ff, msk, (0, 0), 1)
    return m | (1 - ff), E
if __name__ == '__main__':
    ims = []
    for t in [float(v) for v in sys.argv[1].split(',')]:
        m, E = mask(t)
        s = frame(int(round(t * 25)), gray=False)
        cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(s, cs, -1, (0, 0, 255), 2)
        cv2.imwrite(f'/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-ref/lm-{t:.2f}.png', m * 255)
        ims.append(cv2.resize(np.hstack([s, cv2.cvtColor(E.astype(np.uint8), cv2.COLOR_GRAY2BGR)]), None, fx=0.3, fy=0.3))
    cv2.imwrite('/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-ref/lm.jpg', np.vstack(ims))
