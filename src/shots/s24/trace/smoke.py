# the smoke fading through the page hold: E = blurred positive part of (k8 − median) inside the smoke regions,
# traced as additive tone levels; per-frame strength a(k) = least-squares fit of (U_k − median) on E.
import sys, json; sys.path.insert(0, '.')
from common import *
from tone import trace, npts
medc = np.load('pageB_med.npy'); med = cv2.cvtColor(medc / 255, cv2.COLOR_BGR2GRAY) * 255
polys = [[(470, 120), (820, 60), (900, 150), (760, 300), (560, 360), (470, 300)],
         [(1560, 300), (2020, 330), (2020, 640), (1700, 620), (1560, 540)],
         [(1820, 620), (2020, 620), (2020, 946), (1820, 946)]]
R = np.zeros(med.shape, np.uint8)
for p in polys: cv2.fillPoly(R, [np.int32(p)], 1)
D8 = U(8) - med
E = cv2.GaussianBlur(np.clip(cv2.GaussianBlur(D8, (0, 0), 2), 0, None), (0, 0), 4) * R
E = cv2.GaussianBlur(E, (0, 0), 3)
print('E max %.1f  pct' % E.max(), np.percentile(E[R > 0], [50, 90, 99]))
a = {}
for k in range(8, 19):
    d = (U(k) - med)[R > 0]; e = E[R > 0]
    a[k] = round(float(d @ e / (e @ e)), 3)
print('a(k)', a)
M = (E > 4).astype(np.uint8)
L = trace(E, M, [4, 10, 18, 28, 40, 55], sigma=1.0, eps=0.8, min_area=20.0, base=False)
print('pts', npts(L), [round(l['v'], 1) for l in L])
json.dump({'levels': [{'t': l['t'], 'v': l['v'], 'paths': [p.round(2).tolist() for p in l['paths']]} for l in L], 'a': a}, open('out/smoke.json', 'w'))
