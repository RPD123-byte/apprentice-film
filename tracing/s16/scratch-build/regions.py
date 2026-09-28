import cv2, glob, re, sys, numpy as np
d = sys.argv[1]
fr = sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
R = {'headline': (860, 200, 1300, 330), 'bannerL': (200, 230, 700, 330), 'bannerR': (1500, 230, 1950, 330),
     'pageL': (200, 400, 800, 850), 'pageR': (1450, 400, 2000, 850), 'roomTop': (300, 20, 1900, 90), 'roomL': (10, 200, 120, 800)}
print('t', *[f'{k:>22}' for k in R])
for p in fr:
    t = float(re.search(r'at-([\d.]+)s', p).group(1))
    a = cv2.imread(p); b = cv2.imread(p.replace('frame-', 'ref-'))
    row = []
    for k, (x0, y0, x1, y1) in R.items():
        ma = a[y0:y1, x0:x1].reshape(-1, 3).mean(0)[::-1]; mb = b[y0:y1, x0:x1].reshape(-1, 3).mean(0)[::-1]
        row.append(f'{ma[0]:3.0f},{ma[1]:3.0f},{ma[2]:3.0f}|{mb[0]:3.0f},{mb[1]:3.0f},{mb[2]:3.0f}')
    print(f'{t:6.2f}', *row)
