# owlm.py DIR... : owl errors (s1 s2 s8) inside the owl polygon and sub-boxes (head edge, body right, tail), frames 727/745/755
import cv2, numpy as np, sys, os
S = '/Users/computer/rootline/apprentice-film/snapshots/s07-bt/src'
OWL = np.array([[1500, 275], [1540, 255], [1590, 232], [1620, 238], [1650, 262], [1672, 320], [1676, 380], [1672, 415], [1706, 425], [1732, 470], [1745, 540], [1746, 610], [1740, 640], [1768, 655], [1785, 690], [1775, 712], [1735, 712], [1700, 730], [1668, 728], [1640, 700], [1610, 672], [1575, 652], [1530, 622], [1490, 592], [1460, 555], [1452, 510], [1462, 470], [1490, 445], [1512, 440], [1515, 400], [1512, 330]], np.int32)
M = np.zeros((946, 2206), np.uint8); cv2.fillPoly(M, [OWL], 1); M = cv2.dilate(M, np.ones((7, 7), np.uint8)) > 0
B = {'head': (1600, 250, 1690, 430), 'bodyR': (1690, 430, 1760, 650), 'tail': (1600, 600, 1790, 730), 'wing': (1500, 440, 1690, 600), 'plaster': (1480, 275, 1580, 360)}
for d in sys.argv[1:]:
    r = {k: [] for k in ['all'] + list(B)}
    for n in (727, 745, 755):
        if not os.path.exists(f'{d}/r{n:04d}.png'): continue
        a = cv2.cvtColor(cv2.imread(f'{d}/r{n:04d}.png'), cv2.COLOR_BGR2GRAY).astype(np.float32); b = cv2.cvtColor(cv2.imread(f'{S}/n{n:04d}.png'), cv2.COLOR_BGR2GRAY).astype(np.float32)
        E = {s: np.abs(cv2.GaussianBlur(a, (0, 0), s) - cv2.GaussianBlur(b, (0, 0), s)) for s in (1, 2, 8)}
        r['all'].append([E[s][M].mean() for s in (1, 2, 8)])
        for k, (x0, y0, x1, y1) in B.items(): r[k].append([E[s][y0:y1, x0:x1][M[y0:y1, x0:x1]].mean() for s in (1, 2, 8)])
    print(os.path.basename(d).ljust(8), ' | '.join('%s %s' % (k, '/'.join('%.2f' % v for v in np.mean(r[k], 0))) for k in r))
