# trace2790.py OUT.json 'params-json': the white owl at 111.60 (F2790) re-traced in a tight zone (GrabCut silhouette of
# the source frame grown 3 px + the headphones' hull), measurement -> vectors
import cv2, numpy as np, sys, json
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from vtrace import trace, pack, outline, fl
from gradeio import ungrade
import owlmask as o
OUT = sys.argv[1]; P = dict(K=28, wink=True, inkbh=16, inkmax=215, inkq=16, eps=0.7, minarea=5); P.update(json.loads(sys.argv[2]))
F = 2790
z = np.load('/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix2-tools/z2790.npy')
f = o.src(F); U8 = np.clip(ungrade(f, F / 25) * 255 + 0.5, 0, 255).astype(np.uint8)
ys, xs = np.nonzero(z); x0, x1, y0, y1 = max(0, xs.min() - 4), min(2206, xs.max() + 5), max(0, ys.min() - 4), min(946, ys.max() + 5)
regs, inks = trace(U8[y0:y1, x0:x1], z[y0:y1, x0:x1], (x0, y0), P)
zo = [fl(p) for p in outline(z[y0:y1, x0:x1], (x0, y0), 1.0)]
r, i = pack(regs, inks)
json.dump({'frames': {F: [r, i, zo]}}, open(OUT, 'w'), separators=(',', ':'))
print('regions', len(regs), 'inkgroups', len(inks))
