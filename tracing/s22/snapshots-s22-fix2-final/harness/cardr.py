# cardr.py DIR: per rendered frame, the card's left edge (as cardm.py) render vs source, card mottle and σ1.5 error
import sys, cv2, numpy as np, glob, re
sys.path.insert(0, '.')
from cardm import cardAt, leftx, src, gray, hold
d = sys.argv[1]
Fs = sorted(int(re.search(r'r(\d+)\.png', p).group(1)) for p in glob.glob(f'{d}/r*.png'))
def edge_stats(B, c):
    rows = []
    for y in range(196, 352, 4):
        xr = leftx(c, y); x0 = int(xr) - 14; row = B[y, x0:x0 + 30]; i = int(np.argmax(row > 128))
        if i == 0 or row[i] <= 128: continue
        xe = x0 + i - 1 + (128 - row[i - 1]) / (row[i] - row[i - 1]); ins = B[y, int(round(xe)) + 1:int(round(xe)) + 12]
        rows.append((xe - xr, ins[0:3].max(), ins[3:10].min(), np.median(ins[8:11])))
    R = np.array(rows); cr = R[:, 2] < R[:, 3] - 25
    return np.median(R[:, 0]), np.std(np.diff(R[:, 0])) / np.sqrt(2), np.median(R[:, 1]) - np.median(R[:, 3]), cr.mean() * 100
for F in Fs:
    T = F / 25; c = cardAt(T)
    A = cv2.GaussianBlur(gray(cv2.imread(f'{d}/r{F:04d}.png')), (0, 0), 0.5); B = cv2.GaussianBlur(gray(src(F)), (0, 0), 0.5)
    ea, eb = edge_stats(A, c), edge_stats(B, c)
    # card interior mottle: box inside the quad, away from edges and owl
    x0, x1 = int(leftx(c, 300)) + 20, int(leftx(c, 300)) + 170; y0, y1 = 240, 340
    band = lambda X: cv2.GaussianBlur(X, (0, 0), 1) - cv2.GaussianBlur(X, (0, 0), 4)
    ma, mb = band(gray(cv2.imread(f'{d}/r{F:04d}.png')))[y0:y1, x0:x1].std(), band(gray(src(F)))[y0:y1, x0:x1].std()
    ex0 = int(leftx(c, 270)) - 12
    e15 = np.abs(cv2.GaussianBlur(A, (0, 0), 1.5) - cv2.GaussianBlur(B, (0, 0), 1.5))[190:356, ex0:ex0 + 24].mean()
    print(f'{F} edge−quad {ea[0]:+5.2f}/{eb[0]:+5.2f} jag {ea[1]:4.2f}/{eb[1]:4.2f} hairline {ea[2]:+5.1f}/{eb[2]:+5.1f} crease% {ea[3]:3.0f}/{eb[3]:3.0f} | mottle σ1–4 {ma:4.2f}/{mb:4.2f} | edge-strip σ1.5 MAE {e15:5.2f}')
