# Colour-class map of a figure region (measuring region outlines): each pixel -> nearest of the given class colours
# (Lab, on a bilateral-smoothed frame), thin ink removed by a median, then per class: components -> simplified outlines.
# classes.py T 'name:r,g,b name:r,g,b ...' out_prefix [--poly x,y,...] [--eps 2.5] [--min 400] [--med 7]
import sys, json, cv2, numpy as np
from lib import src
a = sys.argv[1:]; opts = {}; pos = []; i = 0
while i < len(a):
    if a[i].startswith('--'): opts[a[i][2:]] = a[i + 1]; i += 2
    else: pos.append(a[i]); i += 1
t = float(pos[0]); out = pos[2]
cls = [(q.split(':')[0], [int(v) for v in q.split(':')[1].split(',')]) for q in pos[1].split()]
f = cv2.imread(opts['img']) if 'img' in opts else src(t)
sm = cv2.bilateralFilter(f, 9, 30, 5)
lab = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB).astype(np.float32)
C = cv2.cvtColor(np.uint8([[c[::-1] for _, c in cls]]), cv2.COLOR_BGR2LAB).astype(np.float32)[0]
d = ((lab[:, :, None, :] - C[None, None]) ** 2 * np.array([0.6, 1, 1])).sum(-1)
lb = d.argmin(-1).astype(np.uint8)
lb = cv2.medianBlur(lb, int(opts.get('med', 7)))
mask = np.ones(lb.shape, np.uint8)
if 'poly' in opts:
    p = np.array(list(map(float, opts['poly'].split(',')))).reshape(-1, 2).astype(np.int32)
    mask[:] = 0; cv2.fillPoly(mask, [p], 1)
eps = float(opts.get('eps', 2.5)); mn = int(opts.get('min', 400))
res = {}
vis = np.zeros_like(f)
pal = [(60, 200, 60), (200, 120, 255), (40, 40, 40), (0, 200, 255), (255, 100, 0), (255, 255, 255), (120, 0, 200), (0, 90, 160)]
for k, (name, c) in enumerate(cls):
    m = ((lb == k) & (mask > 0)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    vis[m > 0] = pal[k % len(pal)]
    cs, _ = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    polys = []
    for cc in cs:
        if cv2.contourArea(cc) < mn: continue
        p = cv2.approxPolyDP(cc, eps, True)[:, 0, :]
        polys.append([[int(x), int(y)] for x, y in p])
    res[name] = polys
    print(name, len(polys), [len(p) for p in polys], file=sys.stderr)
json.dump(res, open(out + '.json', 'w'))
cv2.imwrite(out + '.jpg', cv2.addWeighted(f, 0.4, vis, 0.6, 0))
