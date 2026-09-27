# fix pass 2: per-face gains in the gap view (36.96-39.72): for each geo3.js face, the ratio of pre-grade means
# (source / render) over its visible, lit part of each gap-fit frame (source's lit area gapratio > 0.2, owl masked),
# pixel-weighted over the frames, folded into ../gapface3.js multiplicatively (so it iterates). gapface.py renderdir [k]
# (the per-layer gains of gaplight.py cannot fix one over-bright face: the left stack's middle box peaked at ~180-220
# luma in the gap against the source's brightest ~140-187, at the lamp)
import sys, re, glob, json, cv2, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *
from gapratio import ratio
from tone3 import faces, owl_mask
OUT = ROOT + '/src/shots/s14/gapface3.js'
rd = sys.argv[1]; k = float(sys.argv[2]) if len(sys.argv) > 2 else 0.8
try: cur = json.loads(re.search(r'GAPF = (\{.*\});', open(OUT).read(), re.S).group(1))
except Exception: cur = {}
fr = {round(float(re.search(r'at-([\d.]+)s', f).group(1)), 2): f for f in glob.glob(rd + '/frame-*.png')}
ts = sorted(t for t in fr if t < 39.8)
items = faces()
acc = {}
for t in ts:
    R, den, sim = ratio(t, 6)
    a, bx, by = sim
    S = src(t); Rn = cv2.imread(fr[t])
    om = owl_mask(luma(S), t) | owl_mask(luma(Rn), t)
    lit = (R > 0.2) & (den > 0.05) & ~om
    own = np.full((H, W), -1, np.int32)
    for i, (n, e) in enumerate(items):
        P = np.array(shape_pts(e[1], 72), np.float32) * a + np.array([bx, by], np.float32)
        m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.round(P * 4).astype(np.int32)], 1, cv2.LINE_8, 2)
        own[m > 0] = i
    vs = pregrade(luma(S), t); vr = pregrade(luma(Rn), t)
    for i, (n, e) in enumerate(items):
        m = lit & (own == i)
        m = cv2.erode(m.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
        c = int(m.sum())
        if c < 120: continue
        a0, b0 = float(vs[m].mean()), float(vr[m].mean())
        A = acc.setdefault(n, [e[0], 0.0, 0.0, 0])
        A[1] += a0 * c; A[2] += b0 * c; A[3] += c
rep = []
for n, (L, sa, sb, c) in acc.items():
    if c < 800: continue
    rr = (sa / c + 0.004) / (sb / c + 0.004)
    g0 = cur.get(L, {}).get(n, 1.0)
    g = float(np.clip(g0 * rr ** k, 0.5, 1.6))
    cur.setdefault(L, {})[n] = round(g, 4)
    rep.append((abs(rr - 1) * c, n, round(rr, 3), c))
rep.sort(reverse=True)
open(OUT, 'w').write('// s14 fix pass 2: per-face gains in the gap view (trace3/gapface.py), on top of the 40.08 face gains\nexport const GAPF = ' + json.dumps(cur) + ';\n')
print('worst', [(n, r, c) for _, n, r, c in rep[:12]])
