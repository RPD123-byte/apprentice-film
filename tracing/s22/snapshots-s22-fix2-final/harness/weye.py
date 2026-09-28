# weye.py DIR: the walk's closed-eye strokes, render vs source: darkest graded value along each stroke vs the white
import sys, json, cv2, numpy as np, glob, re
sys.path.insert(0, '.')
from run import src, gray
SP = __import__('os').path.dirname(__import__('os').path.abspath(__file__))   # boxes.json (from boxes.mjs) lives here
BX = json.load(open(f'{SP}/boxes.json'))
STROKES = [[(108.6, 38.9), (115.1, 38.0), (125.6, 35.4)], [(112.1, 42.6), (117.9, 42.5), (122.9, 44.1)]]
d = sys.argv[1]
Fs = sorted(int(re.search(r'r(\d+)\.png', p).group(1)) for p in glob.glob(f'{d}/r*.png'))
Fs = [F for F in Fs if 2043 <= F < 2099]
acc = []
for F in Fs:
    a, b, c, dd, e, f = BX[str(F)]['m']
    A = cv2.GaussianBlur(gray(cv2.imread(f'{d}/r{F:04d}.png')), (0, 0), 0.7); B = cv2.GaussianBlur(gray(src(F)), (0, 0), 0.7)
    row = []
    for S in STROKES:
        vals = []
        for (u0, v0), (u1, v1) in zip(S, S[1:]):
            for s in np.linspace(0, 1, 8):
                u, v = u0 + (u1 - u0) * s, v0 + (v1 - v0) * s
                x, y = a * u + c * v + e, b * u + dd * v + f
                xi, yi = int(round(x)), int(round(y))
                vals.append((A[yi - 2:yi + 3, xi - 1:xi + 2].min(), B[yi - 2:yi + 3, xi - 1:xi + 2].min()))
        row.append(np.array(vals).mean(0))
    x, y = a * 117 + c * 28 + e, b * 117 + dd * 28 + f
    wa, wb = A[int(y) - 3:int(y) + 3, int(x) - 3:int(x) + 3].mean(), B[int(y) - 3:int(y) + 3, int(x) - 3:int(x) + 3].mean()
    acc.append([wa - row[0][0], wb - row[0][1], wa - row[1][0], wb - row[1][1], wa, wb])
    print(F, 'upper depth r/s %3.0f/%3.0f  lower depth r/s %3.0f/%3.0f  white r/s %.0f/%.0f' % tuple(acc[-1]))
print('mean', np.round(np.mean(acc, 0), 1))
