# s28t: refit the locked view's low-frequency colour gain (src/shots/s28/corr.js) multiplicatively: median over the
# locked frames of a render sweep of pre-grade source / render (blurred 36 px, lid excluded), times the current gain.
# Usage: corrfit.py RENDER_DIR
import sys, os, re, json, glob, numpy as np, cv2
os.chdir('/Users/computer/rootline/apprentice-film'); sys.path.insert(0, 'snapshots/s28t-tools/k'); sys.path.insert(0, 'snapshots/s28t-tools')
import grade28 as GR
from m import frame as vframe, SRC
W, H = 2206, 946
src = open('src/shots/s28/corr.js').read()
CO = json.loads(src[src.index('export const CORR = ') + len('export const CORR = '):].rstrip().rstrip(';'))
LIDQ = json.load(open('snapshots/s28t-tools/t/lidquads.json'))
sc = 8; h, w = H // sc + 1, W // sc + 1
q = np.array(LIDQ['131.40'], float) + [[0, -12], [0, -12], [0, 40], [0, 40]]
lidm = np.zeros((H, W), np.uint8); cv2.fillPoly(lidm, [np.int32(q)], 1); lidm = cv2.dilate(lidm, np.ones((31, 31), np.uint8))
valid = (1 - lidm).astype(np.float32); V_ = cv2.resize(valid, (w, h), interpolation=cv2.INTER_AREA)
G = []
for fp in glob.glob(sys.argv[1] + '/frame-*.png'):
    t = float(re.search(r'at-([\d.]+)s', fp).group(1)); tf = np.floor(t * 30 + 1e-6) / 30; k = int(np.ceil(tf * 25 - 1e-6)); t = k / 25
    if t < 131.6 or t > 135.7: continue
    a = cv2.imread(fp)[..., ::-1].astype(np.float32) / 255; b = vframe(SRC, k)[..., ::-1].astype(np.float32) / 255
    pa = GR.ungrade(a, t); pb = GR.ungrade(b, t)
    A = cv2.resize(pa * valid[..., None], (w, h), interpolation=cv2.INTER_AREA); B = cv2.resize(pb * valid[..., None], (w, h), interpolation=cv2.INTER_AREA)
    s = 36 / sc
    Ab = cv2.GaussianBlur(A, (0, 0), s); Bb = cv2.GaussianBlur(B, (0, 0), s); Vb = cv2.GaussianBlur(V_, (0, 0), s)[..., None]
    G.append((Bb / np.maximum(Vb, 1e-3) + 0.01) / (Ab / np.maximum(Vb, 1e-3) + 0.01))
G = np.median(np.array(G), 0); G = np.where(V_[..., None] > 0.5, G, 1.0); G = np.clip(G, 0.9, 1.12)
g32 = cv2.resize(G, (CO['w'], CO['h']), interpolation=cv2.INTER_AREA)
old = np.array(CO['g'], np.float32).reshape(CO['h'], CO['w'], 3) / 255 + 0.5
new = np.clip(old * g32, 0.8, 1.3)
print(len(glob.glob(sys.argv[1] + '/frame-*.png')), 'frames; ratio mean', g32.reshape(-1, 3).mean(0).round(3), 'range', g32.min().round(3), g32.max().round(3))
head = src[:src.index('export const CORR = ')]
if 'corrfit.py' not in head:
    head = head.rstrip('\n') + "\n// Refitted 2026-09-27 by snapshots/s28t-tools/corrfit.py (multiplicative, after the faint ink layer was added).\n"
CO['g'] = [int(round((v - 0.5) * 255)) for v in new.reshape(-1)]
open('src/shots/s28/corr.js', 'w').write(head + 'export const CORR = ' + json.dumps(CO, separators=(',', ':')) + ';\n')
