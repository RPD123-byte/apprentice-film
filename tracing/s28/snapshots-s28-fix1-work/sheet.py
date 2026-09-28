# sheet of render frames (and optionally source) from a dir. Usage: sheet.py DIR out.jpg [--src] [--crop x0 y0 x1 y1] [--w W]
import cv2, numpy as np, sys, glob, re
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28d-tools')
from lib import src
d, out = sys.argv[1], sys.argv[2]
withsrc = '--src' in sys.argv
crop = None
if '--crop' in sys.argv:
    i = sys.argv.index('--crop'); crop = [int(v) for v in sys.argv[i + 1:i + 5]]
w = 1000
if '--w' in sys.argv: w = int(sys.argv[sys.argv.index('--w') + 1])
only = None
if '--t' in sys.argv: only = [float(v) for v in sys.argv[sys.argv.index('--t') + 1].split(',')]
fs = sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
rows = []
for p in fs:
    t = float(re.search(r'at-([\d.]+)s', p).group(1))
    if only and not any(abs(t - o) < 1e-3 for o in only): continue
    ims = [cv2.imread(p)] + ([src(t)] if withsrc else [])
    if crop: ims = [im[crop[1]:crop[3], crop[0]:crop[2]] for im in ims]
    ims = [cv2.resize(im, (w, int(w * im.shape[0] / im.shape[1]))) for im in ims]
    cv2.putText(ims[0], f'{t:.2f}', (10, 30), 0, 1, (0, 0, 255), 2)
    rows.append(np.hstack(ims))
cols = 1 if withsrc else 2
while len(rows) % cols: rows.append(np.zeros_like(rows[0]))
grid = [np.hstack(rows[i:i + cols]) for i in range(0, len(rows), cols)]
cv2.imwrite(out, np.vstack(grid), [cv2.IMWRITE_JPEG_QUALITY, 85])
