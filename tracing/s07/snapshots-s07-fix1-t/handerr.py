# handerr.py DIR... : hands error (sigma 1, 2, 8) inside the hands' moving mask, all frames 727-763
import cv2, numpy as np, re, base64, sys
S = '/Users/computer/rootline/apprentice-film/snapshots/s07-bt/src'
src = open('/Users/computer/rootline/apprentice-film/src/shots/s07/data/hands.js').read()
mk = re.search(r'export const MASK = \["(\w+)", "([^"]+)"\]', src); arr = np.frombuffer(base64.b64decode(mk.group(2)), np.int16)
M = np.zeros((946, 2206), np.uint8); i = 0
while i < len(arr):
    n = int(arr[i]); i += 1; cv2.fillPoly(M, [arr[i:i + 2 * n].reshape(-1, 2).astype(np.int32)], 1); i += 2 * n
M = cv2.erode(M, np.ones((9, 9), np.uint8)) > 0
scr = np.zeros((946, 2206), np.uint8); cv2.fillPoly(scr, [np.array([[315, 246], [834, 168], [898, 519], [409, 648]])], 1); M &= scr == 0
frames = [int(a) for a in sys.argv if a.isdigit()] or list(range(727, 764))
for d in [a for a in sys.argv[1:] if not a.isdigit()]:
    r = {1: [], 2: [], 8: []}
    for n in frames:
        a = cv2.cvtColor(cv2.imread(f'{d}/r{n:04d}.png'), cv2.COLOR_BGR2GRAY).astype(np.float32); b = cv2.cvtColor(cv2.imread(f'{S}/n{n:04d}.png'), cv2.COLOR_BGR2GRAY).astype(np.float32)
        for s in r: r[s].append(np.abs(cv2.GaussianBlur(a, (0, 0), s) - cv2.GaussianBlur(b, (0, 0), s))[M].mean())
    print(d, ' '.join('s%d %.3f' % (s, np.mean(v)) for s, v in r.items()))
