# roomfit.py DIR [F0 F1]: source/render ratio of the margins' light at knots (owl and bright things masked), medians over frames
import sys, glob, re, cv2, numpy as np
sys.path.insert(0, '.')
from run import src, gray
d = sys.argv[1]; F0, F1 = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (0, 9999)
XK = [0, 40, 90, 128, 300, 600, 900, 1200, 1500, 1800, 1950, 2040, 2080, 2130, 2206]
YK = [0, 30, 70, 112, 200, 350, 500, 650, 800, 946]
Fs = sorted(int(re.search(r'r(\d+)\.png', p).group(1)) for p in glob.glob(f'{d}/r*.png'))
Fs = [F for F in Fs if F0 <= F <= F1]
A = []; B = []; M = []
for F in Fs:
    r = gray(cv2.imread(f'{d}/r{F:04d}.png')); s = gray(src(F))
    bright = cv2.dilate(((r > 75) | (s > 75)).astype(np.uint8), np.ones((31, 31), np.uint8)) > 0
    rb = cv2.GaussianBlur(r, (0, 0), 3); sb = cv2.GaussianBlur(s, (0, 0), 3)
    A.append(rb); B.append(sb); M.append(~bright)
A = np.stack(A); B = np.stack(B); M = np.stack(M)
out = np.full((len(YK), len(XK)), np.nan); nn = np.zeros_like(out)
for j, y in enumerate(YK):
    for i, x in enumerate(XK):
        y0, y1, x0, x1 = max(0, y - 14), min(946, y + 15), max(0, x - 14), min(2206, x + 15)
        if 144 + 20 < x < 2023 - 20 and y > 128 + 20: continue   # inside the screen
        m = M[:, y0:y1, x0:x1]
        if m.sum() < 50: continue
        a = A[:, y0:y1, x0:x1][m]; b = B[:, y0:y1, x0:x1][m]
        out[j, i] = np.median(b) / max(1e-3, np.median(a)); nn[j, i] = np.median(a)
np.set_printoptions(linewidth=250, precision=3, suppress=True)
print('ratio source/render (post-grade):'); print(out)
print('render level:'); print(nn.round(1))
