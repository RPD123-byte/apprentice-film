# motion.py DIR... : finger motion energy in the hands' moving mask (frame-to-frame |diff| after a 1.5 px blur),
# render / source ratio and correlation over 727-763
import cv2, numpy as np, re, base64, sys
S = '/Users/computer/rootline/apprentice-film/snapshots/s07-bt/src'
src = open('/Users/computer/rootline/apprentice-film/src/shots/s07/data/hands.js').read()
mk = re.search(r'export const MASK = \["(\w+)", "([^"]+)"\]', src); arr = np.frombuffer(base64.b64decode(mk.group(2)), np.int16)
M = np.zeros((946, 2206), np.uint8); i = 0
while i < len(arr):
    n = int(arr[i]); i += 1; cv2.fillPoly(M, [arr[i:i + 2 * n].reshape(-1, 2).astype(np.int32)], 1); i += 2 * n
M = M > 0
L = lambda p: cv2.GaussianBlur(cv2.cvtColor(cv2.imread(p), cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 1.5)
s = [L(f'{S}/n{n:04d}.png') for n in range(727, 764)]
es = np.array([np.abs(s[k] - s[k - 1])[M].mean() for k in range(1, len(s))])
for d in sys.argv[1:]:
    r = [L(f'{d}/r{n:04d}.png') for n in range(727, 764)]
    er = np.array([np.abs(r[k] - r[k - 1])[M].mean() for k in range(1, len(r))])
    # subtract the static grain floor: median of the quietest quarter
    fs, fr = np.sort(es)[:9].mean(), np.sort(er)[:9].mean()
    print(d, 'energy ratio %.3f (floor-corrected %.3f) corr %.3f' % (er.sum() / es.sum(), (er - fr).clip(0).sum() / (es - fs).clip(0).sum(), np.corrcoef(er, es)[0, 1]))
