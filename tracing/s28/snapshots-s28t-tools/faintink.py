# s28t: a third, faint ink layer for a key drawing (measurement -> vector data): the fine hatching and thin lines that the
# build's two ink layers leave out (lighter than their thresholds). Traced like traceview.py's ink: 2x upsampled pre-grade
# source frame, local-contrast mask, polygons with holes, each with the median colour of its own pixels. Appended to the
# key file as ink shapes with l = 2 (drawn under the other two layers). Usage: faintink.py name [lmax contrast]
import sys, json, os, numpy as np, cv2
os.chdir('/Users/computer/rootline/apprentice-film'); sys.path.insert(0, 'snapshots/s28t-tools/t')
from grade import pre_frame, hexc
from traceview import rings_of
name = sys.argv[1]; LMAX = float(sys.argv[2]) if len(sys.argv) > 2 else 0.78; CON = float(sys.argv[3]) if len(sys.argv) > 3 else 0.07
path = f'src/shots/s28/keys/{name}.js'
s = open(path).read(); head, body = s[:s.index('export default ')], s[s.index('export default ') + len('export default '):].rstrip().rstrip(';')
K = json.loads(body)
K['ink'] = [sh for sh in K['ink'] if sh['l'] != 2]                  # idempotent
t = K['t']; pre = pre_frame(t).astype(np.float32); H, W = pre.shape[:2]
area = np.zeros((H, W), np.uint8)
if 'sil' in K:
    for r in K['sil']: cv2.fillPoly(area, [np.int32(np.round(np.array(r)))], 255)
else:
    area[:] = 255
    for r in K.get('hide', []): cv2.fillPoly(area, [np.int32(np.round(np.array(r)))], 0)
S = 2
P2 = cv2.resize(pre, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
L = cv2.GaussianBlur(0.299 * P2[..., 0] + 0.587 * P2[..., 1] + 0.114 * P2[..., 2], (0, 0), 0.6 * S)
bg = cv2.dilate(L, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(8 * S) + 1,) * 2)); bg = cv2.GaussianBlur(bg, (0, 0), 2.5 * S)
area2 = cv2.resize(area, (W * S, H * S), interpolation=cv2.INTER_NEAREST)
strong = ((L < 0.50) & ((bg - L) > 0.18)) | (L < 0.24)
strong = cv2.dilate(strong.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
m = (L < LMAX) & ((bg - L) > CON) & ~strong & (area2 > 0)
m = m.astype(np.uint8) * 255
ink = []
for rs in rings_of(m, 0.6, 3, 2, S=S):
    mm = np.zeros((H * S, W * S), np.uint8); cv2.fillPoly(mm, [np.int32(np.array(rs[0]) * S)], 255)
    for h_ in rs[1:]: cv2.fillPoly(mm, [np.int32(np.array(h_) * S)], 0)
    px = P2[(mm > 0) & (m > 0)]
    if not len(px): continue
    col = np.median(px, 0)
    ink.append({'c': hexc(np.clip(col, 0, 1)), 'l': 2, 'r': [[[round(x, 1), round(y, 1)] for x, y in ring] for ring in rs]})
K['ink'] = ink + K['ink']
if 'faint ink' not in head:
    head = head.rstrip('\n') + "\n// + a faint third ink layer (l = 2: fine hatching) by snapshots/s28t-tools/faintink.py.\n"
out = json.dumps(K, separators=(',', ':'))
open(path, 'w').write(head + 'export default ' + out + ';\n')
print(name, 'faint shapes', len(ink), 'size', len(out) // 1024, 'KB')
