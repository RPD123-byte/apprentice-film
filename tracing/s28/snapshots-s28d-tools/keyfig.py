# keyfig.py T 'poly x,y ...' out_prefix [--lid 1] [--eps 2]
# Measured OUTLINES of the figure at a key frame: the whole silhouette (every figure class inside the hand polygon,
# minus the laptop lid), and per class group (green = hoodie/beanie, skin, dark = hair/T-shirt/headphones) the region
# rings. Only outlines (simplified polygons) are kept; the drawing (fills, shading, lines) is done in code.
import sys, re, json, cv2, numpy as np
from lib import src
a = sys.argv[1:]; opts = {}; pos = []; i = 0
while i < len(a):
    if a[i].startswith('--'): opts[a[i][2:]] = a[i + 1]; i += 2
    else: pos.append(a[i]); i += 1
t = float(pos[0]); P = np.array([[float(v) for v in q.split(',')] for q in pos[1].split()], np.int32); out = pos[2]
eps = float(opts.get('eps', 2))
CL = {'green': (181, 189, 157), 'dkgreen': (140, 145, 122), 'sungreen': (204, 193, 159), 'skin': (245, 205, 180), 'blush': (225, 160, 150),
      'dkskin': (190, 130, 115), 'black': (35, 30, 30), 'hp': (70, 70, 72), 'wall': (237, 230, 209), 'peach': (216, 190, 165),
      'lid': (80, 79, 77), 'yellow': (236, 213, 158), 'white': (245, 243, 235), 'grey': (150, 150, 140), 'pink': (205, 120, 150),
      'teal': (110, 170, 160), 'brown': (150, 100, 70), 'wood': (200, 160, 120), 'silver': (175, 175, 180)}
names = list(CL)
f = src(t)
sm = cv2.bilateralFilter(f, 9, 30, 5)
lab = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB).astype(np.float32)
C = cv2.cvtColor(np.uint8([[CL[k][::-1] for k in names]]), cv2.COLOR_BGR2LAB).astype(np.float32)[0]
d = ((lab[:, :, None, :] - C[None, None]) ** 2 * np.array([0.6, 1, 1])).sum(-1)
lb = cv2.medianBlur(d.argmin(-1).astype(np.uint8), 5)
poly = np.zeros(lb.shape, np.uint8); cv2.fillPoly(poly, [P], 1)
if opts.get('lid', '1') == '1':
    js = open('../../src/shots/s28/drawn/measure.js').read()
    LQ = eval(re.search(r'export const LIDQ = (\[\[.*?\]\]);', js, re.S).group(1))
    k = int(round((t - LQ[0][0]) * 25)); r = LQ[max(0, min(len(LQ) - 1, k))]
    q = np.array(r[1:9]).reshape(4, 2); c = q.mean(0)
    cv2.fillPoly(poly, [(c + (q - c) * 1.01).astype(np.int32)], 0)
def rings_of(m, mn=250, hole=120):
    cs, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    R = []
    if hier is None: return R
    for j, c in enumerate(cs):
        ar = cv2.contourArea(c)
        isHole = hier[0][j][3] >= 0
        if ar < (hole if isHole else mn): continue
        p = cv2.approxPolyDP(c, eps, True)[:, 0, :]
        if len(p) >= 3: R.append([[int(x), int(y)] for x, y in p])
    return R
def mask(cls, close=7, opn=5):
    m = (np.isin(lb, [names.index(c) for c in cls]) & (poly > 0)).astype(np.uint8)
    if close: m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close, close)))
    if opn: m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (opn, opn)))
    return m & poly
res = {}
fig_cls = ['green', 'dkgreen', 'sungreen', 'skin', 'blush', 'dkskin', 'black', 'hp', 'silver'] if 'figcls' not in opts else opts['figcls'].split(',')
sil = mask(fig_cls, 15, 7)
n, lbl, st, _ = cv2.connectedComponentsWithStats(sil)
keep = [j for j in range(1, n) if st[j, cv2.CC_STAT_AREA] > 4000]
sil = np.isin(lbl, keep).astype(np.uint8)
ff = sil.copy(); mm = np.zeros((sil.shape[0] + 2, sil.shape[1] + 2), np.uint8); cv2.floodFill(ff, mm, (0, 0), 1); sil |= (1 - ff)
res['sil'] = rings_of(sil, 4000, 10 ** 9)
res['green'] = rings_of(mask(['green', 'dkgreen', 'sungreen'], 7, 5) & sil, 400, 300)
res['skin'] = rings_of(mask(['skin', 'blush', 'dkskin'], 7, 5) & sil, 250, 150)
res['dark'] = rings_of(mask(['black', 'hp'], 3, 3) & sil, 150, 80)
json.dump(res, open(out + '.json', 'w'))
vis = f.copy()
col = {'sil': (0, 255, 255), 'green': (0, 200, 0), 'skin': (255, 0, 255), 'dark': (255, 120, 0)}
for k, R in res.items():
    for r in R: cv2.polylines(vis, [np.array(r, np.int32)], True, col[k], 2 if k == 'sil' else 1)
cv2.polylines(vis, [P], True, (0, 0, 255), 1)
cv2.imwrite(out + '.jpg', cv2.resize(vis, None, fx=0.6, fy=0.6))
print({k: (len(v), sum(len(r) for r in v)) for k, v in res.items()})
