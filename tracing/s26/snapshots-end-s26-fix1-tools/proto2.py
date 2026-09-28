# proto2: full-frame trace, regions at 1/R resolution + bright ink at full res
import cv2, numpy as np, sys, json, time
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from vtrace import trace, pack, raster
from gradeio import grade, ungrade
from codec import deep
F = int(sys.argv[1]); P = json.loads(sys.argv[2]); PI = json.loads(sys.argv[3]); R = float(sys.argv[4]); out = sys.argv[5]
src = cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s26c-meas/src/{F}.png')
t = F / 25
U = ungrade(src, t); U8 = np.clip(U * 255 + 0.5, 0, 255).astype(np.uint8)
small = cv2.resize(U8, None, fx=1 / R, fy=1 / R, interpolation=cv2.INTER_AREA)
regs, _ = trace(small, np.ones(small.shape[:2], np.uint8), (0, 0), dict(P, ink=False, wink=False))
for r in regs:
    r[2] = r[2] * R; r[3] = [h * R for h in r[3]]
_, inks = trace(U8, np.ones(U8.shape[:2], np.uint8), (0, 0), dict(PI, K=2, minarea=1e9))
pk = pack(regs, inks); s = json.dumps(deep(pk), separators=(',', ':'))
print('regions', len(regs), 'inkcols', len(inks), 'inkpolys', sum(len(v) for v in inks.values()), 'bytes', len(s), 'regbytes', len(json.dumps(deep(pk[0]), separators=(',', ':'))))
pre = raster(src.shape[:2], pk)
g = (grade(pre[..., ::-1] / 255.0, t)[..., ::-1] * 255)
cv2.imwrite(out, np.clip(g, 0, 255).astype(np.uint8))
def lab(im, s): return cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32) / 255, (0, 0), s), cv2.COLOR_BGR2LAB)
print(' '.join('s%d %.2f' % (sg, np.sqrt(((lab(g, sg) - lab(src, sg)) ** 2).sum(2)).mean()) for sg in (2, 4, 8)))
