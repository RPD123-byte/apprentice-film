# tone_plateA.py : owl-free pre-grade median plate of shot A (frames 1331-1381) for the plate's tone fit. The owl is masked
# by the drawn owl's own alpha (harness layers.js modes 2/3 rendered into snapshots/s18-layA), dilated 20 px.
import sys, os, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('S18SRC', '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18r4/src/')
from common import pre
W = os.environ.get('S18WORK', '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18r4/work')
L = '/Users/computer/rootline/apprentice-film/snapshots/s18-layA'
fr = list(range(1331, 1382))
stack = np.zeros((len(fr), 946, 2206), np.float16); msk = np.zeros((len(fr), 946, 2206), bool)
for i, n in enumerate(fr):
    Cb = cv2.imread(f'{L}/r2{n}.png', 0).astype(np.float32); Cw = cv2.imread(f'{L}/r3{n}.png', 0).astype(np.float32)
    a = np.clip(1 - (Cw - Cb) / 255, 0, 1)
    m = cv2.dilate((a > 0.02).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41))) > 0
    stack[i] = pre(n); msk[i] = m
cnt = (~msk).sum(0)
print('never visible px', (cnt == 0).sum(), 'visible<3', (cnt < 3).sum())
S = np.where(msk, np.nan, stack.astype(np.float32))
med = np.nanmedian(S, axis=0)
# where never visible: the frame with the least owl coverage nearby (median of all)
allmed = np.median(stack.astype(np.float32), axis=0)
med = np.where(np.isnan(med), allmed, med).astype(np.float32)
np.save(f'{W}/bgA_P.npy', med); np.save(f'{W}/bgA_cnt.npy', cnt.astype(np.uint8))
cv2.imwrite(f'{W}/bgA.png', (np.clip(med, 0, 1) * 255).astype(np.uint8))
cv2.imwrite(f'{W}/bgA_cnt.png', (np.minimum(cnt, 25) * 10).astype(np.uint8))
