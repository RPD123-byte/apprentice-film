# regions.py DIR [frames...]: sigma-3 MAE and bias (render - source) per region for rendered frames in DIR
import sys, glob, re, cv2, numpy as np
sys.path.insert(0, '.')
from run import src, gray
d = sys.argv[1]
Fs = [int(re.search(r'r(\d+)\.png', p).group(1)) for p in sorted(glob.glob(f'{d}/r*.png'))]
R = {'top': (0, 0, 2206, 125), 'left': (0, 125, 140, 946), 'right': (2030, 125, 2206, 946), 'strip': (190, 180, 1985, 368), 'page': (145, 368, 2023, 946), 'all': (0, 0, 2206, 946)}
print('F     ' + ' '.join(f'{k:>13}' for k in R))
for F in Fs:
    A = cv2.GaussianBlur(gray(cv2.imread(f'{d}/r{F:04d}.png')), (0, 0), 3); B = cv2.GaussianBlur(gray(src(F)), (0, 0), 3)
    out = []
    for k, (x0, y0, x1, y1) in R.items():
        D = A[y0:y1, x0:x1] - B[y0:y1, x0:x1]; out.append(f'{np.abs(D).mean():6.2f}/{D.mean():+6.2f}')
    print(F, ' '.join(out))
