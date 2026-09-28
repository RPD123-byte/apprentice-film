import sys, json, numpy as np, cv2
sys.path.insert(0, '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s02fx')
from common import *
import re
fs = [int(v) for v in sys.argv[1].split(',')] if ',' in sys.argv[1] else list(range(*[int(v) for v in sys.argv[1].split(':')]))
excl_des = '--nodes' in sys.argv
extract(list(range(225, 263)) + list(range(362, 380)) + fs)
def avg(r):
    a = None
    for f in r:
        p = paint(f); a = p if a is None else a + p
    return a / len(r)
import os
cp = SP_ = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s02fx/'
if os.path.exists(cp + 'stare_ref.npy'): SR = np.load(cp + 'stare_ref.npy'); BR = np.load(cp + 'box_ref.npy')
else:
    SR = avg(range(225, 263)); BR = avg(range(362, 380)); np.save(cp + 'stare_ref.npy', SR); np.save(cp + 'box_ref.npy', BR)
HOLD = off(400)
s02 = open(ROOT + '/src/shots/s02.js').read()
ROWS = [[float(v) for v in r.split(',')] for r in re.findall(r'\[([^\[\]]+)\]', re.search(r'const ROOT = \[(.*?)\];', s02, re.S).group(1))]
rootd = {int(round(r[0] * 25)): r for r in ROWS}
DES = np.zeros((H, W), np.uint8); cv2.rectangle(DES, (540, 0), (1560, H), 1, -1)   # designer (world = stare frame coords)
Ls = list(range(0, 27, 2)); Ss = [0, 0.4, 0.7, 1.0, 1.3, 1.6, 2.0, 2.4, 2.8, 3.2, 3.6]
def dog(g): return cv2.GaussianBlur(g, (0, 0), 1) - cv2.GaussianBlur(g, (0, 0), 3)
out = []
for f in fs:
    P = paint(f); ox, oy = off(f); d = pandir(f)
    best = None
    for name, R, dx, dy, excl in (('stare', SR, ox, oy, DES if (excl_des or f > 400) else None), ('box', BR, ox - HOLD[0], oy - HOLD[1], None)):
        valid = np.ones((H, W), np.float32)
        if excl is not None: valid = valid * (1 - excl)
        Rs = shift(R, dx, dy); Vs = shift(valid, dx, dy)
        m = cv2.erode((Vs > 0.99).astype(np.uint8), np.ones((61, 61), np.uint8)) > 0
        if name == 'box' and f in rootd and f >= 400:
            _, x, y, s, _r = rootd[f]; mm = np.ones((H, W), np.uint8)
            cv2.rectangle(mm, (int(x - 520 * s), int(y - 480 * s)), (int(x + 520 * s), int(y + 380 * s)), 0, -1)
            sx, sy = 930 + dx, 36 + dy; cv2.rectangle(mm, (int(sx), int(sy)), (int(sx + 320), int(sy + 336)), 0, -1)
            m &= mm > 0
        if m.sum() < 20000: continue
        ys, xs = np.nonzero(m); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        Rc, Pc, mc = Rs[y0:y1, x0:x1], P[y0:y1, x0:x1], m[y0:y1, x0:x1]
        res = {}
        def err(L, s):
            k = (round(L, 2), round(s, 2))
            if k not in res: res[k] = float(np.mean((blur(Rc, L, d, s)[mc] - Pc[mc]) ** 2))
            return res[k]
        grid = [(err(L, s), L, s) for L in Ls for s in Ss]
        e, L, s = min(grid)
        for L2 in np.arange(max(0, L - 1.5), L + 1.6, 0.5):
            for s2 in np.arange(max(0, s - 0.3), s + 0.31, 0.1): err(L2, s2)
        e, (L, s) = min((v, k) for k, v in res.items())
        fd = float(np.std(dog(Pc)[mc]) / max(1e-6, np.std(dog(blur(Rc, L, d, s))[mc])))
        rec = dict(f=f, ref=name, L=float(L), s=float(s), e=e * 1e4, n=int(mc.sum()), e0=err(0, 0) * 1e4, fdratio=fd)
        print(rec, flush=True); out.append(rec)
json.dump(out, open(cp + 'blurfit-%s.json' % sys.argv[2] if len(sys.argv) > 2 else cp + 'blurfit.json', 'w'))
