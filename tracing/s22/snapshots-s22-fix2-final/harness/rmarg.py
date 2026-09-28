# rmarg.py DIR: right-margin level, render / source (σ3 means, owl and bright masked), per x band and y band
import sys, glob, re, cv2, numpy as np
sys.path.insert(0, '.')
from run import src, gray
d = sys.argv[1]
Fs = sorted(int(re.search(r'r(\d+)\.png', p).group(1)) for p in glob.glob(f'{d}/r*.png'))
XB = [(2030, 2080), (2080, 2130), (2130, 2160), (2160, 2206)]; YB = [(130, 200), (200, 400), (400, 650), (650, 946)]
for F in Fs:
    A = gray(cv2.imread(f'{d}/r{F:04d}.png')); B = gray(src(F))
    m = ~cv2.dilate(((B > 90) | (A > 90)).astype(np.uint8), np.ones((31, 31), np.uint8)).astype(bool)
    a3, b3 = cv2.GaussianBlur(A, (0, 0), 3), cv2.GaussianBlur(B, (0, 0), 3)
    row = []
    for y0, y1 in YB:
        for x0, x1 in XB:
            mm = m[y0:y1, x0:x1]
            row.append(f'{a3[y0:y1, x0:x1][mm].mean():4.1f}/{b3[y0:y1, x0:x1][mm].mean():4.1f}' if mm.sum() > 200 else '   --    ')
    print(F, ' | '.join(' '.join(row[i:i + 4]) for i in range(0, 16, 4)))
