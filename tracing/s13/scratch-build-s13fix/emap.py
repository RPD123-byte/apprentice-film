# emap.py OUTDIR fi -- 60 px tiles of blurred (sigma 8) |render - source|
import cv2, glob, re, sys, numpy as np
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s13-rev1-p3-src'
out, fi = sys.argv[1], int(sys.argv[2])
def fidx(p):
    t = float(re.search(r'at-([\d.]+)s', p).group(1)); k = int(np.floor(t*30+1e-6)); return int(np.floor(k/30*25+1e-3))
p = [p for p in glob.glob(out+'/frame-*.png') if fidx(p) == fi][0]
a = cv2.imread(p, 0).astype(float); b = cv2.imread(f'{SRC}/f{fi}.png', 0).astype(float)
d = np.abs(cv2.GaussianBlur(a, (0, 0), 8) - cv2.GaussianBlur(b, (0, 0), 8))
print('x0=720 step 60 | rows y step 60')
for y in range(0, 946, 60): print('%3d ' % y + ' '.join('%3d' % int(d[y:y+60, x:x+60].mean()) for x in range(720, 2206, 60)))
