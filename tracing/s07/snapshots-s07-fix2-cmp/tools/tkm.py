# tkm.py DIR... : ticket text box error (page space, rectified; s1 s2 s4) at frames present among 737 745 755 763, vs the source frame (not the mean: the text changes)
import cv2, numpy as np, sys, os
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s07-fix2-cmp/tools'); from rect import rect
S = '/Users/computer/rootline/apprentice-film/snapshots/s07-bt/src'
x0, y0, x1, y1 = 660, 800, 940, 850
for d in sys.argv[1:]:
    r = []
    for n in (737, 745, 755, 763):
        if not os.path.exists(f'{d}/r{n:04d}.png'): continue
        a = cv2.cvtColor(rect(cv2.imread(f'{d}/r{n:04d}.png'), 2), cv2.COLOR_BGR2GRAY).astype(np.float32); b = cv2.cvtColor(rect(cv2.imread(f'{S}/n{n:04d}.png'), 2), cv2.COLOR_BGR2GRAY).astype(np.float32)
        r.append([np.abs(cv2.GaussianBlur(a, (0, 0), s) - cv2.GaussianBlur(b, (0, 0), s))[2*y0:2*y1, 2*x0:2*x1].mean() for s in (2, 4, 8)] + [a[2*y0:2*y1, 2*x0:2*x1].mean() - b[2*y0:2*y1, 2*x0:2*x1].mean()])
    print(os.path.basename(d).ljust(6), 's2 %.2f s4 %.2f s8 %.2f dmean %+.2f' % tuple(np.mean(r, 0)))
