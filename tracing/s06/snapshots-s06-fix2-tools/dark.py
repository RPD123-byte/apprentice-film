#!/usr/bin/env python3
# dark.py DIR frames : per region, mean of render/source on pixels where source < 35, high-pass std (sigma 2), MAE s5/s1.5
import sys
from util import *
R = {'brows': (800, 180, 1320, 300), 'hairC': (930, 120, 1110, 330), 'hairL': (720, 150, 930, 560), 'hairR': (1110, 150, 1450, 560),
     'beanie': (560, 0, 1450, 200), 'lbrowB': (870, 180, 1060, 260), 'room': (0, 0, 560, 560), 'hair': (700, 120, 1450, 560)}
d = sys.argv[1]; F = []
for p in sys.argv[2].split(','):
    if '-' in p: a, b = map(int, p.split('-')); F += list(range(a, b + 1))
    else: F.append(int(p))
keys = sys.argv[3].split(',') if len(sys.argv) > 3 else list(R)
acc = {k: [] for k in keys}
for n in F:
    a = ren(d, n); b = src(n)
    ha = a - cv2.GaussianBlur(a, (0, 0), 2); hb = b - cv2.GaussianBlur(b, (0, 0), 2)
    a5, b5 = cv2.GaussianBlur(a, (0, 0), 5), cv2.GaussianBlur(b, (0, 0), 5); a1, b1 = cv2.GaussianBlur(a, (0, 0), 1.5), cv2.GaussianBlur(b, (0, 0), 1.5)
    for k in keys:
        x0, y0, x1, y1 = R[k]; sa, sb = a[y0:y1, x0:x1], b[y0:y1, x0:x1]; m = sb < 35
        acc[k].append((sa[m].mean(), sb[m].mean(), ha[y0:y1, x0:x1].std(), hb[y0:y1, x0:x1].std(),
                       np.abs(a5 - b5)[y0:y1, x0:x1].mean(), np.abs(a1 - b1)[y0:y1, x0:x1].mean()))
print(f'{"region":8s} dark r/s     hp r/s       mae s5/s1.5')
for k in keys:
    v = np.mean(acc[k], axis=0)
    print(f'{k:8s} {v[0]:5.1f}/{v[1]:5.1f}  {v[2]:5.1f}/{v[3]:5.1f}  {v[4]:5.2f}/{v[5]:5.2f}')
