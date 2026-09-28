#!/usr/bin/env python3
# skinerr.py DIR [IDX]: signed / abs error (sigma 4) on skin only (source blurred 3 > 120, outside the eye openings),
# per socket part, for calibrating the generated hatching
import cv2, sys, glob, numpy as np
d = sys.argv[1]; idx = sys.argv[2] if len(sys.argv) > 2 else '00'
fr = cv2.imread(sorted(glob.glob(f'{d}/frame-{idx}-*.png'))[0], 0).astype(np.float32)
rf = cv2.imread(sorted(glob.glob(f'{d}/ref-{idx}-*.png'))[0], 0).astype(np.float32)
neu = np.load('/Users/computer/rootline/apprentice-film/snapshots/s06-r2-src/neutral.npy')
lit = cv2.GaussianBlur(neu, (0, 0), 3) > 120
eyeL = [[752,322],[790,319],[850,316],[905,315],[935,322],[948,334],[930,348],[900,364],[850,368],[800,364],[765,352],[750,338]]
eyeR = [[1135,328],[1160,310],[1200,303],[1260,301],[1305,298],[1322,305],[1320,335],[1300,346],[1250,354],[1200,354],[1160,350],[1135,342]]
m = np.zeros(fr.shape, np.uint8); cv2.fillPoly(m, [np.array(eyeL), np.array(eyeR)], 1); m = cv2.dilate(m, np.ones((5, 5), np.uint8))
ok = lit & (m == 0)
A = cv2.GaussianBlur(fr, (0, 0), 4); B = cv2.GaussianBlur(rf, (0, 0), 4)
R = {'lidL': (780, 262, 950, 318), 'lidR': (1140, 250, 1330, 305), 'underL': (770, 355, 950, 430), 'underR': (1140, 345, 1330, 445),
     'cornerLo': (745, 290, 790, 400), 'cornerRi': (1095, 260, 1150, 420), 'cornerRo': (1300, 280, 1362, 420),
     'nose': (970, 460, 1150, 610), 'cheekL': (750, 400, 860, 560), 'cheekR': (1260, 380, 1360, 600), 'forehead': (880, 90, 1220, 180),
     'jawL': (860, 680, 1000, 815), 'chin': (960, 740, 1200, 815), 'templeL': (745, 200, 800, 300)}
for k, (x0, y0, x1, y1) in R.items():
    s = np.s_[y0:y1, x0:x1]; o = ok[s]
    if o.sum() < 50: continue
    e = (A[s] - B[s])[o]
    print('%-9s n %6d  signed %+6.2f  abs %5.2f   src mean %6.1f' % (k, o.sum(), e.mean(), np.abs(e).mean(), B[s][o].mean()))
