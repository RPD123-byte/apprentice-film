# evalall.py DIR [n0 n1] : score DIR/r####.png vs source frames (sigma 8 & 2 MAE, by region)
import sys, cv2, numpy as np
A = [x for x in sys.argv[1:] if not x.startswith("-")]; d = A[0]; n0 = int(A[1]) if len(A) > 1 else 726; n1 = int(A[2]) if len(A) > 2 else 763
S = '/Users/computer/rootline/apprentice-film/snapshots/s07-bt/src'
bl = lambda x, s: cv2.GaussianBlur(x, (0, 0), s)
scr = np.zeros((946, 2206), np.uint8); cv2.fillPoly(scr, [np.array([[315, 246], [834, 168], [898, 519], [409, 648]])], 1); scr = scr > 0
hand = np.zeros((946, 2206), bool); hand[470:860, 560:1200] = True
R = {'cuff': (1270, 80, 1900, 260), 'owl': (1440, 170, 1800, 700), 'keys': (420, 500, 1100, 800)}
rows = []
for n in range(n0, n1 + 1):
  a = cv2.imread(f'{d}/r{n:04d}.png'); b = cv2.imread(f'{S}/n{n:04d}.png')
  ag = cv2.cvtColor(a, cv2.COLOR_BGR2GRAY).astype(np.float32); bg = cv2.cvtColor(b, cv2.COLOR_BGR2GRAY).astype(np.float32)
  e8 = np.abs(bl(ag, 8) - bl(bg, 8)); e2 = np.abs(bl(ag, 2) - bl(bg, 2))
  ec = np.abs(bl(a.astype(np.float32), 8) - bl(b.astype(np.float32), 8)).mean(2)
  rows.append((n, e8.mean(), e2.mean(), ec[scr].mean(), e8[hand & ~scr].mean(), e8[~scr & ~hand].mean(), ag.mean() - bg.mean()))
  if '-v' in sys.argv: print('%d mae8 %.2f mae2 %.2f | screen-col %.2f hands %.2f rest %.2f | dmean %+.2f' % rows[-1])
r = np.array(rows)
print('MEAN mae8 %.3f mae2 %.3f | screen-col %.2f hands %.2f rest %.2f | dmean %+.2f   (n726 mae8 %.2f)' % (tuple(r[:, 1:].mean(0)) + (r[0, 1],)))
