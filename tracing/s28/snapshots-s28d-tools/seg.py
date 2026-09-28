# Measure the OUTLINE of one colour region of a source frame as a simplified polygon (for hand-built shapes).
# seg.py T seedx,seedy tol out_prefix [--roi x0,y0,x1,y1] [--close k] [--eps e] [--grow g] [--ref r,g,b] [--sub mask.png]
#        [--poly x,y,x,y,...]   (restrict to a hand polygon)   [--dark d] (treat pixels darker than d as inside, i.e. ink)
# Prints the polygon as JSON (frame px, 1 decimal) and writes out_prefix.jpg (overlay) and out_prefix.png (mask).
import sys, json, cv2, numpy as np
from lib import src
a = sys.argv[1:]
opts = {}; pos = []
i = 0
while i < len(a):
    if a[i].startswith('--'): opts[a[i][2:]] = a[i + 1]; i += 2
    else: pos.append(a[i]); i += 1
t = float(pos[0]); sx, sy = [int(v) for v in pos[1].split(',')]; tol = float(pos[2]); out = pos[3]
f = src(t)
sm = cv2.bilateralFilter(f, 9, 40, 7)
lab = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB).astype(np.float32)
if 'ref' in opts:
    r = np.uint8([[list(map(int, opts['ref'].split(',')))[::-1]]])
    ref = cv2.cvtColor(r, cv2.COLOR_BGR2LAB).astype(np.float32)[0, 0]
else:
    ref = np.median(lab[sy - 4:sy + 5, sx - 4:sx + 5].reshape(-1, 3), 0)
d = np.sqrt(((lab - ref) ** 2 * np.array([0.5, 1, 1])).sum(-1))
m = (d < tol).astype(np.uint8)
if 'dark' in opts:
    L = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
    m |= (L < float(opts['dark'])).astype(np.uint8)
if 'roi' in opts:
    x0, y0, x1, y1 = map(int, opts['roi'].split(','))
    r = np.zeros_like(m); r[y0:y1, x0:x1] = 1; m &= r
if 'poly' in opts:
    p = np.array(list(map(float, opts['poly'].split(',')))).reshape(-1, 2).astype(np.int32)
    r = np.zeros_like(m); cv2.fillPoly(r, [p], 1); m &= r
if 'sub' in opts:
    for s in opts['sub'].split('+'):
        sm_ = cv2.imread(s, 0); m &= (sm_ < 128).astype(np.uint8)
k = int(opts.get('close', 7))
if k > 0:
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
n, lb = cv2.connectedComponents(m)
m = (lb == lb[sy, sx]).astype(np.uint8)
# fill holes
ff = m.copy(); h, w = m.shape
mm = np.zeros((h + 2, w + 2), np.uint8); cv2.floodFill(ff, mm, (0, 0), 1)
m = m | (1 - ff)
g = int(opts.get('grow', 0))
if g > 0: m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * g + 1, 2 * g + 1)))
if g < 0: m = cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (-2 * g + 1, -2 * g + 1)))
cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
c = max(cs, key=cv2.contourArea)
eps = float(opts.get('eps', 2.5))
p = cv2.approxPolyDP(c, eps, True)[:, 0, :]
cv2.imwrite(out + '.png', m * 255)
o = f.copy(); o[m > 0] = (o[m > 0] * 0.6 + np.array([255, 0, 255]) * 0.4).astype(np.uint8)
cv2.polylines(o, [p.astype(np.int32)], True, (0, 255, 0), 1)
x, y, ww, hh = cv2.boundingRect(p)
pad = 40
crop = o[max(0, y - pad):y + hh + pad, max(0, x - pad):x + ww + pad]
cv2.imwrite(out + '.jpg', crop)
print(json.dumps([[round(float(q[0]), 1), round(float(q[1]), 1)] for q in p]).replace(' ', ''))
print('n', len(p), 'area', int(m.sum()), 'bbox', x, y, ww, hh, file=sys.stderr)
