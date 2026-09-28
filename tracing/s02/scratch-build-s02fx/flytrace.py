# FLY (fix pass 1): the flying owl's body, head, headphones and feet, without its wings, traced from the ALIGNED median of
# the level-flight frames 456-476 (each warped into owl units at 2 px per unit, then ECC-aligned on its edges: the old
# median of 446-478 was only root-aligned, up to 4 units off, which smeared the outline, band and claws). The band is
# measured where it crosses the lit cartons (414-440: dark in every aligned frame while the background behind it changes).
import sys; sys.path.insert(0, '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s02fx')
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s02/trace')
from owlloc import *
import levels as lv, json
X = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s02fx/'
S = 2
med = np.load(X + 'flyavg_med.npy'); mx = np.load(X + 'band_mx.npy')
H2, W2 = med.shape
yy, xx = np.mgrid[0:H2, 0:W2]; uu = xx / S + U0; vv = yy / S + V0
fly = cv2.imread(X + 'flyreg.png', 0) > 0
env = np.zeros((H2, W2), np.uint8); ok = (uu >= -560) & (uu < 560) & (vv >= -480) & (vv < 320)
env[ok] = fly[(vv[ok].astype(int) + 480), (uu[ok].astype(int) + 560)]
env = cv2.dilate(env, np.ones((9, 9), np.uint8))
mb = cv2.GaussianBlur(med, (0, 0), 1.0)
bright = ((mb > 0.3) & (env > 0)).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(bright)
body = (lab == lab[int(-V0 * S), int(-U0 * S)]).astype(np.uint8)
ff = body.copy(); mask = np.zeros((H2 + 2, W2 + 2), np.uint8); cv2.floodFill(ff, mask, (0, 0), 1); body |= (1 - ff)
headb = cv2.dilate((mb > 0.45).astype(np.uint8) & body, np.ones((5, 5), np.uint8))
# the band: dark in every frame 414-440 (their backgrounds differ), above / beside the head, outside it
bandc = ((cv2.GaussianBlur(mx, (0, 0), 1.0) < 0.42) & (vv < -30) & (vv > -300) & (np.abs(uu) < 205) & (headb == 0)).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(bandc)
k = 1 + int(np.argmax(st[1:, 4])); band = (lab == k).astype(np.uint8)
band = cv2.morphologyEx(band, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
# the cups: the dark-grey shells beside the head (in the envelope, not bright, not the background: max over the
# carton frames below 0.62)
cups = ((cv2.GaussianBlur(mx, (0, 0), 1.0) < 0.62) & (env > 0) & (np.abs(uu) > 105) & (np.abs(uu) < 205) & (vv > -190) & (vv < 10)).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(cups | band)
keep = np.zeros_like(cups)
for i in range(1, n):
    if st[i, 4] > 400: keep[lab == i] = 1
sil = body | band | (cups & keep)
sil = cv2.morphologyEx(sil, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
sil = cv2.dilate(sil, np.ones((3, 3), np.uint8))            # the dark outline just outside the bright body
cv2.imwrite(X + 'fly2_sil.png', sil * 255)
vis = cv2.cvtColor((np.clip(med, 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
cs, _ = cv2.findContours(sil, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE); cv2.drawContours(vis, cs, -1, (0, 0, 255), 1)
cv2.imwrite(X + 'fly2_sil.jpg', vis)
LEV = [0.05, 0.1, 0.16, 0.24, 0.33, 0.43, 0.53, 0.62, 0.7, 0.77, 0.83, 0.88, 0.92, 0.95]
ms = []
for t in LEV:
    m = ((mb > t) & (sil > 0)).astype(np.uint8) if t > LEV[0] else sil.copy()
    ms.append(cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)) if t > LEV[0] else m)
res = []
for k, m in enumerate(ms):
    bnd = m & (1 - ms[k + 1]) if k + 1 < len(ms) else m
    L = lv.vectorize(med, m, bnd, off=(int(2 * U0), int(2 * V0)), minarea=8, eps=0.8, tile=100000); res.append(L)
print([len(L) for L in res], sum(len(q) for L in res for s in L for q in s['r']), 'points')
json.dump(res, open(X + 'fly2.json', 'w'))
