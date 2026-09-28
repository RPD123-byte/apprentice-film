# ev.py RENDER.png N [label] : blurred MAE vs source frame N (sigma 8 and 2) by region + side-by-side jpg
import sys, cv2, numpy as np
a = cv2.imread(sys.argv[1]); n = int(sys.argv[2])
b = cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s07-bt/src/n{n:04d}.png')
ag = cv2.cvtColor(a, cv2.COLOR_BGR2GRAY).astype(np.float32); bg = cv2.cvtColor(b, cv2.COLOR_BGR2GRAY).astype(np.float32)
bl = lambda x, s: cv2.GaussianBlur(x, (0, 0), s)
scr = np.zeros((946, 2206), np.uint8); cv2.fillPoly(scr, [np.array([[315, 246], [834, 168], [898, 519], [409, 648]])], 1); scr = scr > 0
hand = np.zeros((946, 2206), bool); hand[470:860, 560:1200] = True
e8 = np.abs(bl(ag, 8) - bl(bg, 8)); e2 = np.abs(bl(ag, 2) - bl(bg, 2))
ec = np.abs(bl(a.astype(np.float32), 8) - bl(b.astype(np.float32), 8)).mean(2)
print('%s n%d mae8 %.2f mae2 %.2f col8 %.2f | screen %.2f (col %.2f) hands %.2f rest %.2f dmean %+.2f' % (sys.argv[3] if len(sys.argv) > 3 else '', n, e8.mean(), e2.mean(), ec.mean(), e8[scr].mean(), ec[scr].mean(), e8[hand & ~scr].mean(), e8[~scr & ~hand].mean(), ag.mean() - bg.mean()))
