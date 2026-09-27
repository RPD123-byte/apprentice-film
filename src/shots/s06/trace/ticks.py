#!/usr/bin/env python3
# ticks.py: GENERATED stubble ticks for s06 (measurement only; the film never loads this or any image).
# The stubble is drawn as short tapered ticks. Their number per area follows the MEASURED fine darkness of the source
# (neutral mean, ungraded: paper - value after a white top-hat that keeps only marks thinner than ~4 px, so the jaw
# and hair lines do not count); their direction follows the MEASURED local stroke direction (structure tensor, sigma 4),
# their length / width / value are drawn from the ranges of the source's ticks. Positions are placed by a seeded
# Poisson-disc sampler (not at the source's tick positions).
# Writes src/shots/s06/data/ticks.js: TICKS = flat list x, y, length, width, angle (rad), value per tick.
import cv2, numpy as np, json, os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
pre = np.load(os.path.join(ROOT, 'snapshots/s06-r2-src/neutral_pre.npy')).astype(np.float32); H, W = pre.shape
CFG = json.load(open(os.path.join(HERE, 'cfg/ticks.json')))
g = cv2.GaussianBlur(pre, (0, 0), 0.7)
# fine darkness: black top-hat (closing - value) with a 5 px disc keeps marks thinner than ~4 px
k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
fine = np.clip(cv2.morphologyEx(g, cv2.MORPH_CLOSE, k) - g, 0, 1)
# direction of the fine marks
gg = cv2.GaussianBlur(fine, (0, 0), 1.0)
ix = cv2.Sobel(gg, cv2.CV_32F, 1, 0) / 8; iy = cv2.Sobel(gg, cv2.CV_32F, 0, 1) / 8
j11 = cv2.GaussianBlur(ix * ix, (0, 0), 4); j12 = cv2.GaussianBlur(ix * iy, (0, 0), 4); j22 = cv2.GaussianBlur(iy * iy, (0, 0), 4)
th = 0.5 * np.arctan2(2 * j12, j11 - j22) + np.pi / 2
rs = np.random.RandomState(CFG.get('seed', 5))
out = []
dbg = cv2.cvtColor((np.clip(pre, 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
for R in CFG['regions']:
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.array(R['poly'], np.int32)], 1)
    for P in R.get('exclude', []):
        cv2.fillPoly(m, [np.array(P, np.int32)], 0)
    dens = cv2.GaussianBlur(fine, (0, 0), R.get('dsig', 5)) * m
    L0, L1 = R.get('len', [5, 9]); W0, W1 = R.get('w', [0.8, 1.2]); v = R.get('v', 0.3); paper = R.get('paper', 0.94)
    ink1 = ((L0 + L1) / 2) * ((W0 + W1) / 2) * (paper - v) * 0.7   # ink of one tapered tick
    # expected tick count per px = darkness / ink per tick
    lam = dens * R.get('gain', 1.0) / ink1
    n_exp = float(lam.sum())
    ys, xs = np.nonzero(m)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    pts = []; rmin = R.get('rmin', 3.5)
    tries = 0; lmax = float(lam.max()) + 1e-9
    while len(pts) < n_exp and tries < 200000:
        tries += 1
        x = rs.uniform(x0, x1); y = rs.uniform(y0, y1)
        if m[int(y), int(x)] == 0: continue
        if rs.uniform() * lmax > lam[int(y), int(x)]: continue
        if any((px - x) ** 2 + (py - y) ** 2 < rmin * rmin for px, py in pts[-400:]): continue
        pts.append((x, y))
    for x, y in pts:
        a = float(th[int(y), int(x)])
        if R.get('dir') is not None:
            d, wgt = R['dir']; a = float(np.arctan2(np.sin(a) * (1 - wgt) + np.sin(d) * wgt, np.cos(a) * (1 - wgt) + np.cos(d) * wgt))
        a += rs.uniform(-1, 1) * np.radians(R.get('jit', 10))
        L = rs.uniform(L0, L1); w = rs.uniform(W0, W1); vv = float(np.clip(v + rs.uniform(-0.08, 0.08), 0, 1))
        out += [round(x, 1), round(y, 1), round(L, 1), round(w, 2), round(a, 3), round(vv, 3)]
        cv2.line(dbg, (int(x - np.cos(a) * L / 2), int(y - np.sin(a) * L / 2)), (int(x + np.cos(a) * L / 2), int(y + np.sin(a) * L / 2)), (0, 0, 255), 1)
    print(R['name'], 'expected', round(n_exp), 'placed', len(pts))
cv2.imwrite(os.path.join(ROOT, 'snapshots/s06-fix1p-hatch/ticks.png'), dbg[560:830, 860:1300])
open(os.path.join(HERE, '../data/ticks.js'), 'w').write(
    '// s06 GENERATED stubble ticks (trace/ticks.py): count per area from the MEASURED fine darkness, direction from the\n'
    '// MEASURED local stroke direction, seeded Poisson-disc positions (not the source\'s). x, y, length, width, angle, value.\n'
    'export const TICKS = [' + ','.join('%g' % v for v in out) + '];\n')
print('ticks', len(out) // 6)
