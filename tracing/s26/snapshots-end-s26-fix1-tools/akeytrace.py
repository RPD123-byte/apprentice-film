# akeytrace.py params: trace the A key (meas/akey/kA.png, the median of the A frames at the settled camera)
import cv2, numpy as np, sys, json
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from vtrace import trace, pack, raster
from gradeio import grade
from codec import deep
U8 = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-meas/akey/kA.png')
P = dict(K=28, wink=True, inkq=24, eps=0.7, minarea=5); P.update(json.loads(sys.argv[1]))
r, i = trace(U8, np.ones(U8.shape[:2], np.uint8), (0, 0), P)
R, I = pack(r, i)
d = {'keys': [2763], 'frames': {'2763': [R, I, []]}}
s = json.dumps(deep([R, I]), separators=(',', ':')); print('bytes', len(s))
json.dump(d, open('/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-meas/akeytr.json', 'w'), separators=(',', ':'))
pre = raster(U8.shape[:2], [R, I])
def lab(im, s): return cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32) / 255, (0, 0), s), cv2.COLOR_BGR2LAB)
m = np.zeros(U8.shape[:2], bool); m[128:914, 143:2020] = True
print(' '.join('pre s%d %.2f' % (sg, np.sqrt(((lab(pre, sg) - lab(U8, sg)) ** 2).sum(2))[m].mean()) for sg in (1, 2, 4)))
if len(sys.argv) > 2: cv2.imwrite(sys.argv[2], np.clip(pre, 0, 255).astype(np.uint8))
