# expo.py DIR [--init | --refine]: per-frame pre-grade channel gains for s06 (data/expo.js).
# The render in DIR was made with the current EXPO table; the graded-domain least-squares gain (source / render) on the
# static parts of the frame (face box left out, 20 < level < 235) is folded into the table: p <- p * (1 + (g - 1) * K).
import cv2, numpy as np, glob, re, sys, json, os
d = sys.argv[1]; K = 1.0
OUT = '/Users/computer/rootline/apprentice-film/src/shots/s06/data/expo.js'
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s06-fix1-src'
cur = {}
if os.path.exists(OUT) and '--init' not in sys.argv:
    t = open(OUT).read(); cur = {int(k): v for k, v in json.loads(t[t.index('{'):t.rindex('}') + 1]).items()}
mask = np.ones((946, 2206), bool); mask[150:780, 740:1360] = False
tab = {}
for f in sorted(glob.glob(d + '/f-*.png'), key=lambda p: int(re.search(r'f-(\d+)', p).group(1))):
    n = int(re.search(r'f-(\d+)', f).group(1))
    a = cv2.GaussianBlur(cv2.imread(f).astype(float), (0, 0), 3); b = cv2.GaussianBlur(cv2.imread(f'{SRC}/s-{n}.png').astype(float), (0, 0), 3)
    m = mask & (a.mean(2) > 20) & (a.mean(2) < 235)
    g = [(b[..., c][m] * a[..., c][m]).sum() / (a[..., c][m] ** 2).sum() for c in range(3)]   # B, G, R
    p0 = cur.get(n, [1.0, 1.0, 1.0])   # stored as [r, g, b]
    gr = [g[2], g[1], g[0]]
    p = [min(1.0, p0[i] * (1 + (gr[i] - 1) * K)) for i in range(3)]
    tab[n] = [round(v, 4) for v in p]
    print(n, 'graded gain r %.4f g %.4f b %.4f' % tuple(gr), '-> table', tab[n])
hdr = '''// s06 fix pass 1: per-frame pre-grade channel gains [r, g, b] (<= 1) by source frame index, MEASURED: least-squares
// gain of the graded source over the graded render on the static parts of the frame (the face box left out), folded
// in over passes (snapshots/s06-fix1-tools/expo.py). Numbers only.
'''
open(OUT, 'w').write(hdr + 'export const EXPO = ' + json.dumps({str(k): v for k, v in tab.items()}) + ';\n')
