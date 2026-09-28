# take-off wings 397-404 re-measured against the SITTING owl's silhouette (the owl is still the sitting drawing until it
# leaves the lid at 405; cutting the flying body out of these frames left only thin outer crescents of the wings)
import sys, json, os, numpy as np, cv2
T = '/Users/computer/rootline/apprentice-film/src/shots/s02/trace'; sys.path.insert(0, T)
import wing_local as wl, levels as lv
X = os.environ.get('SCR', '.') + '/'
U0, U1, V0, V1 = wl.U0, wl.U1, wl.V0, wl.V1
res = json.load(open(X + 'wings19.json')); byf = {r['f']: r for r in res}
INK = json.load(open(X + 'wings19-ink.json'))
hold = (cv2.imread(X + 'sit_sil_hold.png', 0) > 0).astype(np.uint8); hold[:, :930] = 0; hold[:, 1250:] = 0; hold[:36] = 0; hold[372:] = 0
x, y, s, rot = [wl.spline(16.0, k) for k in (1, 2, 3, 4)]
c, sn = np.cos(rot), np.sin(rot)
M = np.array([[s * c, -s * sn, x + s * c * U0 - s * sn * V0], [s * sn, s * c, y + s * sn * U0 + s * c * V0]], np.float32)
SITL = (cv2.warpAffine(hold.astype(np.float32), M, (U1 - U0, V1 - V0), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP) > 0.5).astype(np.uint8)
def fill_holes(m):
    ff = m.copy(); h, w = m.shape; mask = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(ff, mask, (0, 0), 1); return m | (1 - ff)
yy, xx = np.mgrid[0:V1 - V0, 0:U1 - U0]; uu = xx + U0; vv = yy + V0
WLEV = [0.6, 0.72, 0.82, 0.9]
for f in range(398, 405):                                # (397: the previous outlines, the wings are still slivers)
    Lp = wl.local(f)[0]; b = cv2.GaussianBlur(Lp, (0, 0), 1.2)
    m = (b > 0.42).astype(np.uint8)          # over the black room behind: the shaded inner wing (0.45-0.7) counts
    m[cv2.dilate(SITL, np.ones((5, 5), np.uint8)) > 0] = 0
    box = (uu < -250) & (vv > 30)                             # the lit carton at the lower left: only the brighter wing
    m[box & (b < 0.84)] = 0
    m[(vv > 118) | (np.hypot(np.abs(uu) - 104, vv + 44) > 470) | ((np.abs(uu) < 150) & (vv < -150))] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    for side, sel in (('L', uu < 0), ('R', uu > 0)):
        mm = (m & sel).astype(np.uint8)
        n, lab, st, _ = cv2.connectedComponentsWithStats(mm)
        if n < 2: continue
        k = 1 + int(np.argmax(st[1:, 4])); wm = fill_holes((lab == k).astype(np.uint8))
        wm = cv2.morphologyEx(wm, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
        wm = (cv2.GaussianBlur(wm.astype(np.float32), (0, 0), 1.5) > 0.5).astype(np.uint8)
        grown = cv2.dilate(wm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31))) & SITL & sel.astype(np.uint8)
        wm2 = wm | grown
        cs, _ = cv2.findContours(wm2, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cc = max(cs, key=cv2.contourArea)
        q = cv2.approxPolyDP(cc, 1.2, True)[:, 0, :].astype(float)
        byf[f][side] = [[round(px + U0, 1), round(py + V0, 1)] for px, py in q]
        # interior from the frame itself; the part under the sitting body = the pale root
        P = cv2.GaussianBlur(Lp, (0, 0), 0.8)
        mask = np.zeros_like(wm2); cv2.fillPoly(mask, [np.round(q).astype(np.int32)], 1)
        ms = [mask] + [(((P > t) | ((grown > 0) & (t < 0.8))) & (mask > 0)).astype(np.uint8) for t in WLEV]
        ms = [ms[0]] + [cv2.morphologyEx(z, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)) for z in ms[1:]]
        INK[str(f)][side] = lv.stack(P, ms, off=(U0, V0), eps=1.5, minarea=10, tile=100000)
        print(f, side, int(wm2.sum()), flush=True)
json.dump(res, open(X + 'wings20.json', 'w')); json.dump(INK, open(X + 'wings20-ink.json', 'w'))
