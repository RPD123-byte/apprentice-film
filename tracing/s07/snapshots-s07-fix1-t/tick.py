# tick.py DIR... : ticket-text right edge (page units) per frame, source vs renders
import cv2, numpy as np, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s07-fix1-t')
from rect import rect
S = '/Users/computer/rootline/apprentice-film/snapshots/s07-bt/src/n%04d.png'
def edge(p):
    a = rect(cv2.imread(p)); g = cv2.cvtColor(a, cv2.COLOR_BGR2GRAY).astype(float)
    roi = g[805:860, 670:950]; dark = roi < 130
    cols = np.where(dark.sum(0) >= 3)[0]; return 670 + cols.max() if len(cols) else -1
bad = 0
for n in range(726, 764):
    e = [edge(S % n)] + [edge(f'{d}/r{n:04d}.png') for d in sys.argv[1:]]
    flag = ' '.join('<--' if abs(x - e[0]) >= 6 else '   ' for x in e[1:])
    bad += sum(abs(x - e[0]) >= 6 for x in e[1:])
    print(n, e, flag)
print('frames off by >= 6:', bad)
