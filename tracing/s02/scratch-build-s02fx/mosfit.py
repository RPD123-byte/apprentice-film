import sys, json, numpy as np, cv2, re, ast
sys.path.insert(0, '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s02fx')
from common import *
cp = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s02fx/'
X0, Y0 = -240, -2000
fs = [int(v) for v in sys.argv[1].split(',')]
fix = {}
for fn in ['cr-a', 'cr-b', 'cr-c', 'cr-d', 'cr-e']:
    for l in open(cp + fn + '.log'):
        if l.startswith('{'): r = ast.literal_eval(l); fix[r['f']] = (r['sx'], r['sy'])
s02 = open(ROOT + '/src/shots/s02.js').read()
ROWS = [[float(v) for v in r.split(',')] for r in re.findall(r'\[([^\[\]]+)\]', re.search(r'const ROOT = \[(.*?)\];', s02, re.S).group(1))]
rootd = {int(round(r[0] * 25)): r for r in ROWS}
M = {k: np.load(cp + 'mos_%s.npy' % k) for k in ('PAN_OUT', 'PAN_BACK')}
Ls = [0, 4, 8, 12, 16, 20, 26]; Ss = [0, 0.7, 1.4, 2.0, 2.8, 3.6]
out = []
for f in fs:
    P = paint(f); o = off(f); fx = fix.get(f, (0, 0)); ox, oy = o[0] + fx[0], o[1] + fx[1]; d = pandir(f)
    mos = M['PAN_OUT' if f < 400 else 'PAN_BACK']
    A = np.float32([[1, 0, X0 + ox], [0, 1, Y0 + oy]])
    V = cv2.warpAffine(mos, A, (W, H), flags=cv2.INTER_LINEAR, borderValue=-1)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32); wx = xx - ox; wy = yy - oy
    m = (V >= 0) & ~((wx >= -20) & (wx < W + 20) & (wy >= -20) & (wy < H + 20)) & ~((wx >= 2183) & (wx < 4430) & (wy >= -1913) & (wy < -927))
    m &= ~((wx > 540) & (wx < 1560) & (wy > -420))       # the designer and his crown
    if f >= 400 and f in rootd:
        _, x, y, s_, _r = rootd[f]; m[max(0, int(y - 500 * s_)):int(y + 400 * s_), max(0, int(x - 560 * s_)):int(x + 560 * s_)] = False
    m = cv2.erode(m.astype(np.uint8), np.ones((31, 31), np.uint8)) > 0
    if m.sum() < 30000: continue
    ys, xs = np.nonzero(m); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    Vc, Pc, mc = V[y0:y1, x0:x1].copy(), P[y0:y1, x0:x1], m[y0:y1, x0:x1]; Vc[Vc < 0] = 0
    res = {}
    for L in Ls:
        for s in Ss:
            b = blur(Vc, L, d, s); res[(L, s)] = float(np.mean((b[mc] - Pc[mc]) ** 2))
    (L, s) = min(res, key=res.get)
    rec = dict(f=f, L=L, s=s, e=res[(L, s)] * 1e4, e00=res[(0, 0)] * 1e4, n=int(mc.sum()))
    print(rec, flush=True); out.append(rec)
