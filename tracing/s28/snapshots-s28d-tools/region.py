# region.py T 'cls1,cls2' 'x,y,x,y,...' out [--eps 3] [--close 9] [--img f.png] [--med 7] [--grow 1] [--open 5]
# Outline (measured) of the union of colour classes inside a hand polygon: largest component, holes filled, simplified.
# Classes (graded source colours): green, skin, blush, black, wall, peach, lid, yellow, white, grey
import sys, cv2, numpy as np
from lib import src
CL = {'green': (181, 189, 157), 'skin': (245, 205, 180), 'blush': (225, 160, 150), 'black': (35, 30, 30), 'wall': (237, 230, 209),
      'peach': (216, 190, 165), 'lid': (80, 79, 77), 'yellow': (236, 213, 158), 'white': (245, 243, 235), 'grey': (150, 150, 140),
      'hp': (70, 70, 72), 'pink': (205, 120, 150), 'teal': (110, 170, 160), 'brown': (150, 100, 70), 'wood': (200, 160, 120), 'dkgreen': (140, 145, 122), 'sungreen': (204, 193, 159), 'tshirt': (20, 18, 20), 'dkskin': (190, 130, 115)}
a = sys.argv[1:]; opts = {}; pos = []; i = 0
while i < len(a):
    if a[i].startswith('--'): opts[a[i][2:]] = a[i + 1]; i += 2
    else: pos.append(a[i]); i += 1
t = float(pos[0]); want = pos[1].split(','); P = np.array(list(map(float, pos[2].replace(' ', ',').split(',')))).reshape(-1, 2).astype(np.int32); out = pos[3]
use = opts.get('classes', ','.join(CL)).split(',')
f = cv2.imread(opts['img']) if 'img' in opts else src(t)
sm = cv2.bilateralFilter(f, 9, 30, 5)
lab = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB).astype(np.float32)
C = cv2.cvtColor(np.uint8([[CL[k][::-1] for k in use]]), cv2.COLOR_BGR2LAB).astype(np.float32)[0]
d = ((lab[:, :, None, :] - C[None, None]) ** 2 * np.array([0.6, 1, 1])).sum(-1)
lb = cv2.medianBlur(d.argmin(-1).astype(np.uint8), int(opts.get('med', 7)))
m = np.isin(lb, [use.index(w) for w in want]).astype(np.uint8)
r = np.zeros_like(m); cv2.fillPoly(r, [P], 1); m &= r
k = int(opts.get('close', 9))
if k: m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
ko = int(opts.get('open', 5))
if ko: m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ko, ko)))
m &= r
n, lbl, st, _ = cv2.connectedComponentsWithStats(m)
if n > 1:
    if opts.get('all', '0') == '1':
        keep = [j for j in range(1, n) if st[j, cv2.CC_STAT_AREA] >= int(opts.get('minarea', 400))]
        m = np.isin(lbl, keep).astype(np.uint8)
    else:
        j = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]); m = (lbl == j).astype(np.uint8)
if opts.get('holes', '0') != '1':
    ff = m.copy(); mm = np.zeros((m.shape[0] + 2, m.shape[1] + 2), np.uint8); cv2.floodFill(ff, mm, (0, 0), 1); m = m | (1 - ff)
g = int(opts.get('grow', 1))
if g > 0: m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * g + 1, 2 * g + 1)))
if opts.get('holes', '0') == '1':
    cs, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    rings = [cv2.approxPolyDP(c, float(opts.get('eps', 3)), True)[:, 0, :] for c in cs if cv2.contourArea(c) >= float(opts.get('minhole', 30))]
    print('[' + ','.join('[' + ','.join(f'[{x},{y}]' for x, y in r) + ']' for r in rings) + ']')
    p = max(rings, key=lambda r: cv2.contourArea(r.astype(np.int32)))
    print('rings', len(rings), sum(len(r) for r in rings), file=sys.stderr)
else:
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)
    p = cv2.approxPolyDP(c, float(opts.get('eps', 3)), True)[:, 0, :]
    print('[' + ','.join(f'[{x},{y}]' for x, y in p) + ']')
print('n', len(p), file=sys.stderr)
o = f.copy(); o[m > 0] = (o[m > 0] * 0.55 + np.array([255, 0, 255]) * 0.45).astype(np.uint8)
cv2.polylines(o, [p.astype(np.int32)], True, (0, 255, 0), 1); cv2.polylines(o, [P], True, (255, 255, 0), 1)
x, y, w, h = cv2.boundingRect(P)
cv2.imwrite(out, o[max(0, y - 20):y + h + 20, max(0, x - 20):x + w + 20])
