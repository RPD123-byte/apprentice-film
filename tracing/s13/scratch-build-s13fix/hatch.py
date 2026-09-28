# hatch.py OUTDIR fi,... -- skeleton length of ink strokes (local darkness > thr) in regions: render vs source
import cv2, glob, re, sys, numpy as np
from skimage.morphology import skeletonize
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s13-rev1-p3-src'
out = sys.argv[1]; frames = [int(x) for x in sys.argv[2].split(',')]
R = {'chest': (960, 480, 1420, 820), 'tail': (1560, 640, 1860, 946), 'feet': (1160, 840, 1330, 946)}
def fidx(p):
    t = float(re.search(r'at-([\d.]+)s', p).group(1)); k = int(np.floor(t*30+1e-6)); return int(np.floor(k/30*25+1e-3))
def skl(img, box, thr):
    x0, y0, x1, y1 = box; g = cv2.GaussianBlur(img, (0, 0), 1.0)
    bg = cv2.GaussianBlur(cv2.dilate(g, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))), (0, 0), 2)
    d = (bg - g)[y0:y1, x0:x1]; lit = cv2.GaussianBlur(img, (0, 0), 4)[y0:y1, x0:x1] > 90
    return int(skeletonize((d > thr) & lit).sum())
for fi in frames:
    p = [p for p in glob.glob(out + '/frame-*.png') if fidx(p) == fi][0]
    a = cv2.imread(p, 0).astype(np.float32); b = cv2.imread(f'{SRC}/f{fi}.png', 0).astype(np.float32)
    print(fi, ' '.join('%s thr20 %d/%d thr50 %d/%d' % (k, skl(a, v, 20), skl(b, v, 20), skl(a, v, 50), skl(b, v, 50)) for k, v in R.items()))
