# walkeye.py DIR [dx dy]: the walk's closed-eye strokes, render vs source: darkest value along each stroke (graded)
import sys, json, cv2, numpy as np, glob, re
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s22-fix1-h')
from run import src, gray
d = sys.argv[1]; SP = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad'
WT = json.load(open(f'{SP}/walkT.json'))
def pose(t):
    r = WT[0]
    for k in WT:
        if k[0] <= t + 0.005: r = k
    return r[1:]
STROKES = [[(108.6, 38.9), (115.1, 38.0), (125.6, 35.4)], [(112.1, 42.6), (117.9, 42.5), (122.9, 44.1)]]
Fs = sorted(int(re.search(r'r(\d+)\.png', p).group(1)) for p in glob.glob(f'{d}/r*.png'))
Fs = [F for F in Fs if 81.72 <= F / 25 < 83.96]
acc = []
for F in Fs:
    a, b, c, dd, e, f = pose(F / 25)
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
        vals = np.array(vals); row.append(vals.mean(0))
    # white round the eye
    x, y = a * 117 + c * 30 + e, b * 117 + dd * 30 + f
    wa, wb = A[int(y) - 3:int(y) + 3, int(x) - 3:int(x) + 3].mean(), B[int(y) - 3:int(y) + 3, int(x) - 3:int(x) + 3].mean()
    acc.append([*row[0], *row[1], wa, wb])
    print(F, 'upper r/s %.0f/%.0f  lower r/s %.0f/%.0f  white r/s %.0f/%.0f' % (*row[0], *row[1], wa, wb))
print('mean', np.round(np.mean(acc, 0)))
