# usage: crop.py OUTDIR fi x0 y0 x1 y1 zoom out.png  -- render | source crop, zoomed
import cv2, glob, re, sys, numpy as np
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s13-rev1-p3-src'
out, fi, x0, y0, x1, y1, z, dst = sys.argv[1], int(sys.argv[2]), *map(int, sys.argv[3:7]), float(sys.argv[7]), sys.argv[8]
def fidx(p):
    t = float(re.search(r'at-([\d.]+)s', p).group(1)); k = int(np.floor(t*30+1e-6)); return int(np.floor(k/30*25+1e-3))
b = cv2.imread(f'{SRC}/f{fi}.png')[y0:y1, x0:x1]
ims = [b]
if out != '-':
    ps = [p for p in glob.glob(out+'/frame-*.png') if fidx(p) == fi]
    a = cv2.imread(ps[0])[y0:y1, x0:x1]; ims = [a, np.full((y1-y0, 4, 3), 128, np.uint8), b]
im = np.hstack(ims)
im = cv2.resize(im, None, fx=z, fy=z, interpolation=cv2.INTER_CUBIC if z > 1 else cv2.INTER_AREA)
cv2.imwrite(dst, im)
