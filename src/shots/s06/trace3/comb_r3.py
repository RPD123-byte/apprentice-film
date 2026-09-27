#!/usr/bin/env python3
# comb_r3.py: the fine bristles above the upper lip, traced relative to the mouth line (measurement only).
# For the neutral mean and the held smile: the source is compared with the r3 mouth layer's render plus the mouth line
# (drawn with the calibrated MLINE of mline_fit.py); the missing darkness in a band 1.5-18 px above the line is traced as
# pen strokes (trace3.py), calibrated (fit.py), and each point written as (u, d, w, v, b) relative to that line
# (lineframe.py), so the film draws the comb on each frame's own fitted line. Writes src/shots/s06/data/r3_comb.js.
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np, cv2, jsdata, lineframe
from trace3 import trace
from fit import fit
from region import retone
from mline_fit import draw_line
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
SRC = os.path.join(ROOT, 'snapshots/s06-r2-src'); OUT = os.path.join(ROOT, 'snapshots/s06-r3-out')
MLINE = json.load(open(os.path.join(OUT, 'mline.json')))
OPTS = {'end': 3, 'endMin': 0.15, 'soft': 0.6, 'wMin': 0.2}
M = jsdata.load('mouth')
res = {}
for key, line, prefile, layer in (('N', M['NEUTRAL']['line'], 'neutral_pre3.npy', 'mouth_layer.npy'), ('S', M['SMILE']['line'], 'smile_pre3.npy', 'mouth_s_layer.npy')):
    pre = np.load(os.path.join(SRC, prefile)); H, W = pre.shape
    base = np.load(os.path.join(OUT, layer)).copy()
    A = np.asarray(line).reshape(-1, 5)
    x0, y0, x1, y1 = int(A[:, 0].min()) - 30, int(A[:, 1].min()) - 30, int(A[:, 0].max()) + 30, int(A[:, 1].max()) + 30
    sub = base[y0:y1, x0:x1].copy(); draw_line(sub, line, MLINE, (x0, y0)); base[y0:y1, x0:x1] = sub
    band = lineframe.band_mask(line, (H, W), 1.5, 18.0, 0.02, 0.98)
    st, _ = trace(pre, band, ground=base, lo=0.01, hi=0.022, dmin=0.02, sigmas=(0.7, 1.0, 1.4), minlen=3, step=1.5, smooth=1, join_r=3.0)
    st = retone(st, 0.6)
    T = pre[y0:y1, x0:x1]; Mk = lineframe.band_mask(line, (H, W), 0.5, 18.0)[y0:y1, x0:x1]
    L = []
    st, _, R = fit(st, base[y0:y1, x0:x1], T, Mk, OPTS, off=(x0, y0), iters=8, log=L, ground_fix=False, fix_tone=True, twoscale=[0.7, 2.0])
    print(key, len(st), 'strokes; fit', ' '.join(f'{v:.2f}' for v in L))
    im = np.hstack([R, base[y0:y1, x0:x1], T]); cv2.imwrite(os.path.join(OUT, f'comb-{key}.png'), cv2.resize((np.clip(im, 0, 1) * 255).astype(np.uint8), None, fx=3, fy=3))
    ud = []
    for s in st:
        S = np.asarray(s).reshape(-1, 5); U = lineframe.to_ud(line, S[:, :2])
        ud.append(np.column_stack([U, S[:, 2:]]))
    res[key] = ud
def fmt(st): return '[\n' + ',\n'.join('[' + ','.join('%g,%g,%g,%g,%g' % (round(p[0], 4), round(p[1], 2), round(p[2], 2), round(p[3], 3), round(p[4], 3)) for p in S) + ']' for S in st) + '\n]'
js = ['// s06 r3 lip comb: the fine bristles above the upper lip, MEASURED on the neutral mean (N) and the held smile (S)',
      '// by src/shots/s06/trace3/comb_r3.py: pen strokes traced above the mouth line and calibrated against the source,',
      '// each point u (fraction of the line\'s length), d (px along its upward normal), w, v, b — the film re-attaches them',
      '// to each frame\'s fitted line. Numbers only, no pixels.',
      'export const COMB_OPTS = ' + json.dumps(OPTS) + ';',
      'export const MLINE3 = ' + json.dumps(MLINE) + ';',
      'export const COMB_N = ' + fmt(res['N']) + ';', 'export const COMB_S = ' + fmt(res['S']) + ';']
p = os.path.join(HERE, '../data/r3_comb.js'); open(p, 'w').write('\n'.join(js) + '\n'); print('->', p, os.path.getsize(p) // 1024, 'KB')
