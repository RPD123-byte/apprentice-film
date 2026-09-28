# paint a key (regions + ink, clipped to sil) over magenta, side by side with its source frame. Usage: keyview.py name x0 y0 x1 y1 out.jpg
import json, subprocess, sys, numpy as np, cv2
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28t-tools')
from m import frame, SRC
name = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); outp = sys.argv[6]
subprocess.run(['node', '/Users/computer/rootline/apprentice-film/snapshots/s28t-tools/keyras.mjs', name, '/tmp/s28t_key.json'], check=True)
K = json.load(open('/tmp/s28t_key.json'))
W, H = 2206, 946
def hexc(h): return (int(h[5:7], 16), int(h[3:5], 16), int(h[1:3], 16))
img = np.zeros((H, W, 3), np.uint8); img[:] = (255, 0, 255)
def fill(rings, col):
    mm = np.zeros((H, W), np.uint8)
    for r in rings:
        tmp = np.zeros_like(mm); cv2.fillPoly(tmp, [np.round(np.array(r)).astype(np.int32)], 1); mm ^= tmp
    img[mm > 0] = col
for R in K.get('regions', []): fill(R['r'], hexc(R['c']))
if 'sil' in K:
    sil = np.zeros((H, W), np.uint8)
    for r in K['sil']:
        tmp = np.zeros_like(sil); cv2.fillPoly(tmp, [np.round(np.array(r)).astype(np.int32)], 1); sil ^= tmp
    img[sil == 0] = (255, 0, 255)
for l in [0, 1]:
    for sh in K.get('ink', []):
        if sh['l'] == l: fill(sh['r'], hexc(sh['c']))
s = frame(SRC, round(K['t'] * 25))
out = np.hstack([img[y0:y1, x0:x1], s[y0:y1, x0:x1]])
cv2.imwrite(outp, out)
