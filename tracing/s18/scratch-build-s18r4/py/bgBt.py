# bgBt.py : background of shot B from the tip frames where neither the tipped keyboard nor the owl covers it
import sys, os, numpy as np, cv2
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s18/trace2')
os.environ.setdefault('S18SRC', '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18r4/src/')
from common import pre
W = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18r4/work'
L = '/Users/computer/rootline/apprentice-film/snapshots/s18-layT'
fr = [1424, 1425, 1427, 1428, 1429, 1430, 1431, 1432]
S = []
al = lambda b, w: np.clip(1 - (cv2.imread(w, 0).astype(np.float32) - cv2.imread(b, 0).astype(np.float32)) / 255, 0, 1)
for n in fr:
    ka = al(f'{L}/r7{n}.png', f'{L}/r8{n}.png'); oa = al(f'{L}/r2{n}.png', f'{L}/r3{n}.png')
    cover = cv2.dilate((ka > 0.02).astype(np.uint8), np.ones((15, 15), np.uint8)) | cv2.dilate((oa > 0.02).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (61, 61)))
    P = pre(n); P[cover > 0] = np.nan; S.append(P)
S = np.array(S); cnt = np.isfinite(S).sum(0)
med = np.nanmedian(S, axis=0)
np.save(f'{W}/bgBt_P.npy', np.nan_to_num(med, nan=-1).astype(np.float32)); np.save(f'{W}/bgBt_cnt.npy', cnt.astype(np.uint8))
cv2.imwrite(f'{W}/bgBt.png', (np.clip(np.nan_to_num(med, nan=0), 0, 1) * 255).astype(np.uint8))
print('visible px', (cnt >= 2).sum())
