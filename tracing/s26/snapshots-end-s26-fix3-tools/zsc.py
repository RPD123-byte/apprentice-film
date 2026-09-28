# zsc.py F0-F1 label=pattern ... : dE (sigma 1.5/4/12) inside each frame's colour-owl zone box (owlTraceF.js zone bbox + 12 px)
import cv2, numpy as np, sys, json
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from codec import dec
ROOT = '/Users/computer/rootline/apprentice-film/'
SRC = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s26f3/src/s{F}.png'
L = open(ROOT + 'src/shots/s26/owlTraceF.js').read().split('\n')
i0 = next(i for i, l in enumerate(L) if l.startswith('export const OWL_F = [')) + 1
def box(F):
    p = np.concatenate([np.array(dec(s)).reshape(-1, 2) / 2 for s in json.loads(L[i0 + F - 2852].rstrip(','))[2]])
    x0, y0 = np.maximum(p.min(0) - 12, 0).astype(int); x1, y1 = np.minimum(p.max(0) + 12, [2206, 946]).astype(int); return x0, y0, x1, y1
a, b = sys.argv[1].split('-'); Fs = range(int(a), int(b) + 1); pats = [x.split('=', 1) for x in sys.argv[2:]]
def lab(im, s): return cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32) / 255, (0, 0), s), cv2.COLOR_BGR2LAB)
acc = {l: [] for l, _ in pats}
for F in Fs:
    S = cv2.imread(SRC.format(F=F)); x0, y0, x1, y1 = box(F)
    for l, p in pats:
        R = cv2.imread(p.format(F=F))
        if R is None: continue
        acc[l].append([float(np.sqrt(((lab(R, s) - lab(S, s)) ** 2).sum(-1))[y0:y1, x0:x1].mean()) for s in (1.5, 4, 12)])
for l, v in acc.items(): print('ZONEBOX', l, np.round(np.mean(v, 0), 3), 'n', len(v))
