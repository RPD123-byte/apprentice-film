# breathing check: phase-correlation displacement of regions at each time vs 131.5, render vs source. Usage: breathm.py DIR
import cv2, numpy as np, sys, glob, re
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28d-tools')
from lib import src
d = sys.argv[1]
R = {'hair': (1050, 280, 1200, 420), 'beanie': (1380, 140, 1580, 330), 'mouth': (1130, 500, 1250, 600), 'chin': (1120, 560, 1260, 650), 'fingers': (1300, 630, 1440, 700),
     'forearm': (950, 700, 1150, 840), 'shoulder': (600, 250, 820, 420)}
fs = {float(re.search(r'at-([\d.]+)s', p).group(1)): p for p in glob.glob(d + '/frame-*.png')}
g = lambda im: cv2.GaussianBlur(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 1.5)
r0, s0 = g(cv2.imread(fs[131.5])), g(src(131.5))
acc = {k: [[], []] for k in R}
for t in sorted(fs):
    if t <= 131.5: continue
    r, s = g(cv2.imread(fs[t])), g(src(t)); row = []
    for k, (x0, y0, x1, y1) in R.items():
        win = cv2.createHanningWindow((x1 - x0, y1 - y0), cv2.CV_32F)
        (rx, ry), _ = cv2.phaseCorrelate(r0[y0:y1, x0:x1], r[y0:y1, x0:x1], win)
        (sx, sy), _ = cv2.phaseCorrelate(s0[y0:y1, x0:x1], s[y0:y1, x0:x1], win)
        row.append(f'{k} {rx:+.1f},{ry:+.1f}|{sx:+.1f},{sy:+.1f}'); acc[k][0].append(ry); acc[k][1].append(sy)
    print(f'{t:.2f}  ' + '  '.join(row))
print('mean dy render|source: ' + '  '.join(f'{k} {np.mean(v[0]):+.1f}|{np.mean(v[1]):+.1f}' for k, v in acc.items()))
