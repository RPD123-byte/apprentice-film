# Per-layer light in the gap view (36.92-39.96): for each render frame, the ratio (pre-grade mean, source / render)
# over each room layer's pixels inside the source's lit area (gapratio > 0.2, owl masked) -> ../gaplight3.js
# (multiplied into the existing gains, so it iterates). gaplight.py renderdir [k]
import sys, re, glob, json, cv2, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *
from gapratio import ratio
from tone3 import faces, owl_mask
OUT = ROOT + '/src/shots/s14/gaplight3.js'
LAY = ['back', 'ceiling', 'floor', 'left', 'aside', 'right', 'synth', 'under', 'deskBase', 'deskTop']
rd = sys.argv[1]; k = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
try:
    cur = json.loads(re.search(r'GAPL = (\{.*\});', open(OUT).read(), re.S).group(1))
except Exception:
    cur = {'t': [], 'g': {}}
fr = {round(float(re.search(r'at-([\d.]+)s', f).group(1)), 2): f for f in glob.glob(rd + '/frame-*.png')}
ts = sorted(t for t in fr if t < 40)
items = faces()
new = {'t': ts, 'g': {L: [] for L in LAY}}
def curval(L, t):
    if not cur['t']: return 1.0
    return float(np.interp(t, cur['t'], cur['g'].get(L, [1.0] * len(cur['t']))))
for t in ts:
    R, den, sim = ratio(t, 6)
    a, bx, by = sim
    S = src(t); Rn = cv2.imread(fr[t])
    om = owl_mask(luma(S), t) | owl_mask(luma(Rn), t)
    lit = (R > 0.2) & (den > 0.05) & ~om
    # layer ownership in the frame: later layers (and later faces) on top
    own = np.full((H, W), -1, np.int16)
    for (n, e) in items:
        P = np.array(shape_pts(e[1], 72), np.float32) * a + np.array([bx, by], np.float32)
        m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.round(P * 4).astype(np.int32)], 1, cv2.LINE_8, 2)
        own[m > 0] = LAY.index(e[0])
    vs = pregrade(luma(S), t); vr = pregrade(luma(Rn), t)
    row = []
    for i, L in enumerate(LAY):
        m = lit & (own == i)
        c = curval(L, t)
        if m.sum() < 300:
            new['g'][L].append(round(c, 4)); row.append(f'{L}:-'); continue
        rr = float(vs[m].mean() / max(1e-4, vr[m].mean()))
        g = float(np.clip(c * (1 + k * (rr - 1)), 0.2, 2.5))
        new['g'][L].append(round(g, 4)); row.append(f'{L}:{g:.2f}({m.sum()})')
    print(f'{t:.2f}', ' '.join(row), flush=True)
open(OUT, 'w').write('// s14 round 3: per-layer light in the gap view (trace3/gaplight.py): gains at source frame times t\nexport const GAPL = ' + json.dumps(new) + ';\n')
