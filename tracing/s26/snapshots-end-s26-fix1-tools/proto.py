import cv2, numpy as np, sys, json, time
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from vtrace import trace, pack, raster
from gradeio import grade, ungrade
from codec import deep
F = int(sys.argv[1]); P = json.loads(sys.argv[2]); out = sys.argv[3]
src = cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s26c-meas/src/{F}.png')
t = F / 25
U = ungrade(src, t); U8 = np.clip(U * 255 + 0.5, 0, 255).astype(np.uint8)
mask = np.ones(src.shape[:2], np.uint8)
t0 = time.time(); regs, inks = trace(U8, mask, (0, 0), P); dt = time.time() - t0
pk = pack(regs, inks); s = json.dumps(deep(pk), separators=(',', ':'))
print('regions', len(regs), 'inkcols', len(inks), 'inkpolys', sum(len(v) for v in inks.values()), 'bytes', len(s), 'time %.1f' % dt)
pre = raster(src.shape[:2], pk)
g = (grade(pre[..., ::-1] / 255.0, t)[..., ::-1] * 255)
cv2.imwrite(out, np.clip(g, 0, 255).astype(np.uint8))
def lab(im, s): return cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32) / 255, (0, 0), s), cv2.COLOR_BGR2LAB)
for sg in (4, 8, 12):
    print('s%d %.2f' % (sg, np.sqrt(((lab(g, sg) - lab(src, sg)) ** 2).sum(2)).mean()))
