# Per-face gain per dolly frame: for each source frame 40.00-40.64 and each geo3.js face, the ratio of pre-grade
# means (source / render) over the face's visible part (later faces and layers removed, owl masked), folded into
# ../facegain3.js multiplicatively (so it iterates). facegain.py renderdir [k]
import sys, re, glob, json, cv2, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *
from tone3 import faces, visible_masks, owl_mask
OUT = ROOT + '/src/shots/s14/facegain3.js'
TS = [round(40.0 + 0.04 * k, 2) for k in range(17)]
rd = sys.argv[1]; k = float(sys.argv[2]) if len(sys.argv) > 2 else 0.8
try: cur = json.loads(re.search(r'FG3 = (\{.*\});', open(OUT).read(), re.S).group(1))
except Exception: cur = {'t': [], 'g': {}}
if cur.get('t') != TS: cur = {'t': TS, 'g': {}}
fr = {round(float(re.search(r'at-([\d.]+)s', f).group(1)), 2): f for f in glob.glob(rd + '/frame-*.png')}
items = faces()
stat = []
for i, t in enumerate(TS):
    if t not in fr: continue
    S = src(t); Rn = cv2.imread(fr[t])
    vs = pregrade(luma(S), t); vr = pregrade(luma(Rn), t)
    om = owl_mask(luma(S), t) | owl_mask(luma(Rn), t)
    vis = visible_masks(items, t)
    errs = []
    for (n, e), m in zip(items, vis):
        m = m.astype(bool) & ~om
        L = e[0]
        arr = cur['g'].setdefault(L, {}).setdefault(n, [1.0] * len(TS))
        npx = int(m.sum())
        if npx < 150: continue
        a, b = float(vs[m].mean()), float(vr[m].mean())
        if b < 0.01 and a < 0.01: continue
        rr = (a + 0.004) / (b + 0.004)
        g = float(np.clip(arr[i] * rr ** k, 0.3, 3.0))
        arr[i] = round(g, 4)
        errs.append((abs(a - b), npx))
    w = sum(n for _, n in errs) or 1
    stat.append(f'{t:.2f}:{sum(e * n for e, n in errs) / w:.3f}')
# faces never measured at a frame keep 1; smooth nothing (the source's light does change frame to frame)
open(OUT, 'w').write('// s14 round 3: per-face gains per dolly frame (trace3/facegain.py): g[layer][face] = gain at each t\nexport const FG3 = ' + json.dumps(cur) + ';\n')
print('weighted |dv| before this fold:', ' '.join(stat))
