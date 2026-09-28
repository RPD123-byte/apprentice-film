# fit shift + smear L + sigma of a CHARACTER region (designer = the look drawing; owl = the sitting owl at the hold)
# against each pan frame: reference = the static average, masked to the character's silhouette (eroded)
import sys, json, numpy as np, cv2, re
sys.path.insert(0, '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s02fx')
from common import *
cp = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s02fx/'
which = sys.argv[1]; fs = [int(v) for v in sys.argv[2].split(',')]
extract(fs)
geo = json.load(open(cp + 'geo.json'))
def poly_mask(pts):
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.round(np.array(pts)).astype(np.int32)], 1); return m
if which == 'stareroom':
    R = np.load(cp + 'stare_ref.npy'); M = np.ones((H, W), np.uint8); cv2.rectangle(M, (540, 0), (1560, H), 0, -1); base = (0.0, 0.0)
elif which == 'boxroom':
    R = np.load(cp + 'box_ref.npy'); M = np.ones((H, W), np.uint8); cv2.rectangle(M, (900, 0), (1290, 372), 0, -1); base = off(400)
elif which == 'des':
    R = np.load(cp + 'stare_ref.npy')
    M = poly_mask(geo['HOODIE']) | poly_mask(geo['SKIN']) | poly_mask(geo['BEANIE'])
    for p in geo['HAIR']: M |= poly_mask([[p['o'][i], p['o'][i + 1]] for i in range(0, len(p['o']), 2)])
    M[813:] = 0
    base = (0.0, 0.0)
else:
    R = np.load(cp + 'box_ref.npy'); M = np.zeros((H, W), np.uint8); cv2.ellipse(M, (1088, 200), (150, 175), 0, 0, 360, 1, -1); M[345:] = 0
    base = off(400)
M = cv2.erode(M, np.ones((5, 5), np.uint8))
s02 = open(ROOT + '/src/shots/s02.js').read()
ROWS = [[float(v) for v in r.split(',')] for r in re.findall(r'\[([^\[\]]+)\]', re.search(r'const ROOT = \[(.*?)\];', s02, re.S).group(1))]
rootd = {int(round(r[0] * 25)): r for r in ROWS}
Ls = [0, 2, 4, 6, 8, 11, 14, 18, 22]; Ss = [0, 0.4, 0.7, 1.0, 1.4, 1.8, 2.4, 3.0]
out = []
for f in fs:
    P = paint(f); ox, oy = off(f); d = pandir(f); dx, dy = ox - base[0], oy - base[1]
    Rs = shift(R, dx, dy); Ms = shift(M.astype(np.float32), dx, dy) > 0.5
    if f >= 400 and which in ('stareroom', 'boxroom'):
        _, x, y, s_, _r = rootd[f]; Ms[max(0, int(y - 500 * s_)):int(y + 400 * s_), max(0, int(x - 560 * s_)):int(x + 560 * s_)] = False
    # inside the frame, away from the border
    Ms[:12] = 0; Ms[-12:] = 0; Ms[:, :12] = 0; Ms[:, -12:] = 0
    if Ms.sum() < 5000: continue
    ys, xs = np.nonzero(Ms); y0, y1, x0, x1 = max(0, ys.min() - 40), min(H, ys.max() + 40), max(0, xs.min() - 40), min(W, xs.max() + 40)
    Rc, Pc, mc = Rs[y0:y1, x0:x1], P[y0:y1, x0:x1], Ms[y0:y1, x0:x1]
    best = (1e9, None)
    cache = {}
    def err(L, s, sx, sy):
        k = (L, s)
        if k not in cache: cache[k] = blur(Rc, L, d, s)
        b = shift(cache[k], sx, sy)
        return float(np.mean((b[mc] - Pc[mc]) ** 2))
    # shift search at a middle blur: coarse grid then refine
    sx, sy = 0.0, 0.0
    for rad, step in ((16, 4), (4, 1), (1, 0.5)):
        cands = [(err(6, 1.0, sx + i, sy + j), sx + i, sy + j) for i in np.arange(-rad, rad + 0.01, step) for j in np.arange(-rad, rad + 0.01, step)]
        _, sx, sy = min(cands)
    grid = [(err(L, s, sx, sy), L, s) for L in Ls for s in Ss]
    e, L, s = min(grid)
    for rad, step in ((2, 1), (1, 0.5)):
        cands = [(err(L, s, sx + i, sy + j), sx + i, sy + j) for i in np.arange(-rad, rad + 0.01, step) for j in np.arange(-rad, rad + 0.01, step)]
        _, sx, sy = min(cands)
        grid = [(err(L2, s2, sx, sy), L2, s2) for L2 in sorted(set([max(0, L - 2), L, L + 2, max(0, L - 1), L + 1])) for s2 in sorted(set([max(0, round(s - 0.2, 2)), s, round(s + 0.2, 2)]))]
        e, L, s = min(grid)
    rec = dict(f=f, L=L, s=s, sx=sx, sy=sy, e=e * 1e4, n=int(mc.sum()), e00=err(0, 0, 0, 0) * 1e4)
    print(rec, flush=True); out.append(rec)
json.dump(out, open(cp + f'charfit-{which}-{sys.argv[3] if len(sys.argv) > 3 else "x"}.json', 'w'))
