import cv2, numpy as np, sys
d = sys.argv[1]; k = int(sys.argv[2]) if len(sys.argv) > 2 else 0
import glob
f = sorted(glob.glob(d + '/frame-*.png'))[k]; r = d + '/ref-%02d.png' % k
a = cv2.imread(f, 0).astype(np.float32); b = cv2.imread(r, 0).astype(np.float32)
P = {'cheekL': (870, 420, 930, 470), 'cheekR': (1180, 430, 1240, 480), 'foreh': (1000, 180, 1040, 230), 'chin': (1000, 800, 1100, 810), 'hoodW': (300, 700, 420, 790),
     'hoodR': (1550, 700, 1700, 790), 'hoodBand': (250, 560, 400, 600), 'cuffMid': (950, 20, 1100, 70), 'cuffL': (620, 60, 700, 140), 'bagL': (790, 370, 900, 400), 'bagR': (1180, 365, 1290, 395),
     'nose': (1010, 480, 1090, 560), 'hairL': (600, 300, 700, 500), 'room': (1700, 100, 2000, 400), 'roomL': (50, 100, 400, 400)}
for n, (x0, y0, x1, y1) in P.items():
    print(f'{n:9s} render {a[y0:y1, x0:x1].mean():6.1f}  src {b[y0:y1, x0:x1].mean():6.1f}  diff {a[y0:y1, x0:x1].mean() - b[y0:y1, x0:x1].mean():+6.1f}')
