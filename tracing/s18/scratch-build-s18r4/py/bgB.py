# bgB.py : owl-free pre-grade median plate of shot B before the tip (frames 1382-1417), owl masked by the drawn owl's alpha
import sys, os, numpy as np, cv2
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s18/trace2')
os.environ.setdefault('S18SRC', '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18r4/src/')
from common import pre
W = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18r4/work'
L = '/Users/computer/rootline/apprentice-film/snapshots/s18-layB'
fr = list(range(1382, 1418))
S = np.zeros((len(fr), 946, 2206), np.float32)
for i, n in enumerate(fr):
    Cb = cv2.imread(f'{L}/r2{n}.png', 0).astype(np.float32); Cw = cv2.imread(f'{L}/r3{n}.png', 0).astype(np.float32)
    a = np.clip(1 - (Cw - Cb) / 255, 0, 1)
    m = cv2.dilate((a > 0.02).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31))) > 0
    P = pre(n); P[m] = np.nan; S[i] = P
cnt = np.isfinite(S).sum(0)
print('never visible px', (cnt == 0).sum(), 'visible<3', (cnt < 3).sum())
med = np.nanmedian(S, axis=0)
np.save(f'{W}/bgB_P.npy', np.nan_to_num(med, nan=-1).astype(np.float32)); np.save(f'{W}/bgB_cnt.npy', cnt.astype(np.uint8))
cv2.imwrite(f'{W}/bgB.png', (np.clip(np.nan_to_num(med, nan=0), 0, 1) * 255).astype(np.uint8))
cv2.imwrite(f'{W}/bgB_cnt.png', (np.minimum(cnt, 25) * 10).astype(np.uint8))
