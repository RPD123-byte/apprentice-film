# ftest.py F params-json out.png : trace one colour-owl frame with params, preview (graded) over the source, zone error
import cv2, numpy as np, sys, json
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from vtrace import trace, pack, raster
from gradeio import grade, ungrade
from codec import deep
import owlmask as o
F = int(sys.argv[1]); P = json.loads(sys.argv[2])
f = o.src(F); U = ungrade(f, F / 25); U8 = np.clip(U * 255 + 0.5, 0, 255).astype(np.uint8)
z = o.fmask(F)[0] if F >= 2852 else o.zone(F)
regs, inks = trace(U8, z, (0, 0), P); pk = pack(regs, inks)
print('bytes', len(json.dumps(deep(pk), separators=(',', ':'))), 'regions', len(regs))
pre = raster(f.shape[:2], pk, bg=U * 255)
g = np.clip(grade(pre[..., ::-1] / 255.0, F / 25)[..., ::-1] * 255, 0, 255).astype(np.uint8)
cv2.imwrite(sys.argv[3], g)
def lab(im, s): return cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32) / 255, (0, 0), s), cv2.COLOR_BGR2LAB)
print(' '.join('s%d %.2f' % (sg, np.sqrt(((lab(g, sg) - lab(f, sg)) ** 2).sum(2))[z > 0].mean()) for sg in (1, 2, 4)))
