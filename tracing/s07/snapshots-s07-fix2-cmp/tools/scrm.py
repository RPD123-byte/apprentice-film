# scrm.py DIR... : screen-quad metrics on frames 727/745/755: colour s2/s8 error, Laplacian energy r/s, dark-ground noise std r/s
import cv2, numpy as np, sys, os
S = '/Users/computer/rootline/apprentice-film/snapshots/s07-bt/src'
Q = np.array([[315, 246], [834, 168], [898, 519], [409, 648]]); M = np.zeros((946, 2206), np.uint8); cv2.fillPoly(M, [Q], 1); M = cv2.erode(M, np.ones((9, 9), np.uint8)) > 0
for d in sys.argv[1:]:
    r = []
    for n in (727, 745, 755):
        if not os.path.exists(f'{d}/r{n:04d}.png'): continue
        a = cv2.imread(f'{d}/r{n:04d}.png').astype(np.float32); b = cv2.imread(f'{S}/n{n:04d}.png').astype(np.float32)
        e2 = np.abs(cv2.GaussianBlur(a, (0, 0), 2) - cv2.GaussianBlur(b, (0, 0), 2)).mean(2)[M].mean(); e8 = np.abs(cv2.GaussianBlur(a, (0, 0), 8) - cv2.GaussianBlur(b, (0, 0), 8)).mean(2)[M].mean()
        ag, bg = a.mean(2), b.mean(2)
        la, lb = np.abs(cv2.Laplacian(ag, cv2.CV_32F))[M].mean(), np.abs(cv2.Laplacian(bg, cv2.CV_32F))[M].mean()
        D = M & (cv2.GaussianBlur(bg, (0, 0), 4) < 45) & (cv2.GaussianBlur(ag, (0, 0), 4) < 45)
        na, nb = (ag - cv2.GaussianBlur(ag, (0, 0), 1.5))[D].std(), (bg - cv2.GaussianBlur(bg, (0, 0), 1.5))[D].std()
        r.append((e2, e8, la, lb, na, nb))
    r = np.mean(r, 0)
    print(os.path.basename(d).ljust(8), 's2 %.2f s8 %.2f | lap r %.1f s %.1f | darknoise r %.2f s %.2f' % tuple(r))
