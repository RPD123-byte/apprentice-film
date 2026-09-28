# tone_owlB.py : the TRACK_B-registered mean of the source and of the raw render over 1382-1416 inside the drawn owl
# (snapshots/s18-rawB, s18-layB): target of the belly / far-wing tone fit.
import sys, os, re, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('S18SRC', '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18r4/src/')
from common import pre
W = os.environ.get('S18WORK', '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18r4/work')
txt = open('/Users/computer/rootline/apprentice-film/src/shots/s18/shotB.js').read()
TR = {int(a): (int(b), int(c)) for a, b, c in re.findall(r'\[(\d{4}), (-?\d+), (-?\d+)\]', txt.split('export const TRACK_B')[1].split('];')[0])}
LB = '/Users/computer/rootline/apprentice-film/snapshots/s18-layB'
sS = 0; sR = 0; n = 0; K = 0
for f in range(1382, 1417):
    dx, dy = TR[f]; dy -= 45
    S = pre(f); R = cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s18-rawB/r{f}.png', 0).astype(np.float32) / 255
    Cb = cv2.imread(f'{LB}/r2{f}.png', 0).astype(np.float32); Cw = cv2.imread(f'{LB}/r3{f}.png', 0).astype(np.float32)
    al = np.clip(1 - (Cw - Cb) / 255, 0, 1)
    M = np.float32([[1, 0, dx], [0, 1, dy]])
    RW, RH = 2206 + 620, 946 + 90
    reg = lambda img: cv2.warpAffine(img, M, (RW, RH), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderValue=0)
    m = (reg(al) > 0.98).astype(np.float32)
    sS = sS + reg(S) * m; sR = sR + reg(R) * m; n = n + m; K += 1
ok = n >= 0.6 * K
T = np.where(ok, sS / np.maximum(n, 1), -1).astype(np.float32); R = np.where(ok, sR / np.maximum(n, 1), 0).astype(np.float32)
np.save(f'{W}/oB_T.npy', T); np.save(f'{W}/oB_R.npy', R); np.save(f'{W}/oB_M.npy', ok)
E = cv2.GaussianBlur(np.where(ok, T - R, 0), (0, 0), 6)
v = np.clip(128 + E * 255 * 4, 0, 255).astype(np.uint8); v[~ok] = 128
cv2.imwrite(f'{W}/oB_res.jpg', cv2.resize(cv2.applyColorMap(v, cv2.COLORMAP_JET), None, fx=0.4, fy=0.4))
print('owl px', ok.sum(), 'mean T/R', T[ok].mean(), R[ok].mean())
