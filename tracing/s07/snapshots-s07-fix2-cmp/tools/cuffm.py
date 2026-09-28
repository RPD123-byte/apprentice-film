# cuffm.py DIR... : cuff metrics on frames present (727,745,755): s2/s8 error in the cuff polygon (extended left), orientation L1 vs source (3 boxes), fine-energy per band
import cv2, numpy as np, sys, os
S = '/Users/computer/rootline/apprentice-film/snapshots/s07-bt/src'
P = np.array([[1600,158],[1652,158],[1700,160],[1750,158],[1800,152],[1830,143],[1850,133],[1872,120],[1890,106],[1886,180],[1872,229],[1850,250],[1830,264],[1800,277],[1750,287],[1700,293],[1676,290],[1663,263],[1648,242],[1625,226],[1600,215]], np.int32)
M = np.zeros((946,2206), np.uint8); cv2.fillPoly(M, [P], 1); M = M > 0
def hist(g, x0, y0, x1, y1):
    g = cv2.GaussianBlur(g, (0, 0), 1.0); gx = cv2.Sobel(g, cv2.CV_32F, 1, 0)[y0:y1, x0:x1]; gy = cv2.Sobel(g, cv2.CV_32F, 0, 1)[y0:y1, x0:x1]
    m = np.hypot(gx, gy); b = ((np.degrees(np.arctan2(gy, gx)) + 180) % 180 + 90) % 180 - 90
    h, _ = np.histogram(b, bins=12, range=(-90, 90), weights=m); return h / h.sum()
BOX = [(1660,165,1760,285), (1760,150,1830,280), (1830,120,1890,250)]
BANDS = [(1600,1640), (1640,1670), (1670,1720), (1720,1800), (1800,1890)]
for d in sys.argv[1:]:
    e2 = []; e8 = []; ol = []; fe = []
    for n in (727, 745, 755):
        if not os.path.exists(f'{d}/r{n:04d}.png'): continue
        a = cv2.cvtColor(cv2.imread(f'{d}/r{n:04d}.png'), cv2.COLOR_BGR2GRAY).astype(np.float32); b = cv2.cvtColor(cv2.imread(f'{S}/n{n:04d}.png'), cv2.COLOR_BGR2GRAY).astype(np.float32)
        e2.append(np.abs(cv2.GaussianBlur(a,(0,0),2) - cv2.GaussianBlur(b,(0,0),2))[M].mean()); e8.append(np.abs(cv2.GaussianBlur(a,(0,0),8) - cv2.GaussianBlur(b,(0,0),8))[M].mean())
        ol.append([np.abs(hist(a, *bx) - hist(b, *bx)).sum() for bx in BOX])
        fa, fb = np.abs(a - cv2.GaussianBlur(a,(0,0),2)), np.abs(b - cv2.GaussianBlur(b,(0,0),2))
        fe.append([(fa[160:285, x0:x1][M[160:285, x0:x1]].mean(), fb[160:285, x0:x1][M[160:285, x0:x1]].mean()) for x0, x1 in BANDS])
    fe = np.mean(fe, 0)
    print(os.path.basename(d), 's2 %.2f s8 %.2f | orientL1 %s | fine r/s %s' % (np.mean(e2), np.mean(e8), ' '.join('%.3f' % v for v in np.mean(ol, 0)), ' '.join('%.1f/%.1f' % tuple(v) for v in fe)))
