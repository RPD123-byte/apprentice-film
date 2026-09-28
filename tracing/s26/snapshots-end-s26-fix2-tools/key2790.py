# key2790.py OUT.json: the source frame 111.60 (F2790) traced full frame outside the owl's tight zone (the owl is its own
# traced layer), as C's own key for that frame (measurement -> vectors). Params as end-s26-fix1-tools/ckeytrace.py.
import cv2, numpy as np, sys, json
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from vtrace import trace, pack
from gradeio import ungrade
import owlmask as o
from multiprocessing import Pool
F = 2790
P = dict(K=28, wink=True, inkq=24, eps=0.7, minarea=5)
z = np.load('/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix2-tools/z2790.npy')
U8 = np.clip(ungrade(o.src(F), F / 25) * 255 + 0.5, 0, 255).astype(np.uint8)
mask = (1 - cv2.erode(z, np.ones((13, 13), np.uint8))).astype(np.uint8)
if __name__ == '__main__':
    regs, inks = trace(U8, mask, (0, 0), P)
    R, I = pack(regs, inks)
    json.dump({'keys': [F], 'frames': {F: [R, I, []]}}, open(sys.argv[1], 'w'), separators=(',', ':'))
    print('regions', len(R), 'ink groups', len(I))
