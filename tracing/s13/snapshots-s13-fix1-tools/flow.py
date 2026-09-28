# flow.py FRAMES PART|x0,y0,x1,y1 SPACING out.json [--mask sil:part] [--viz out.jpg]
# Measure coarse fur statistics on the source (for authored rule-based strokes, not tracing): on a grid of anchors
# inside a part mask, the local stroke orientation (structure tensor, doubled-angle), its coherence, the ink coverage
# (fraction of pixels >= 28 levels under the local paper level), the mean ink depth, and the paper level (pre-grade).
import sys, json, cv2, numpy as np
from common import *
fr, part, sp, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
I = src(fr)
silk = sys.argv[sys.argv.index('--sil') + 1] if '--sil' in sys.argv else 'silC'
if ',' in part:
    x0, y0, x1, y1 = map(int, part.split(',')); M = np.zeros(I.shape, np.uint8); M[y0:y1, x0:x1] = 1
    if '--mask' in sys.argv:
        k = sys.argv[sys.argv.index('--mask') + 1]; M &= ringmask(jsdata(silk)[k])
else:
    M = ringmask(jsdata(silk)[part])
gx = cv2.Sobel(cv2.GaussianBlur(I, (0, 0), 1.2), cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(cv2.GaussianBlur(I, (0, 0), 1.2), cv2.CV_32F, 0, 1, ksize=3)
si = sp * 0.55
Jxx = cv2.GaussianBlur(gx * gx, (0, 0), si); Jyy = cv2.GaussianBlur(gy * gy, (0, 0), si); Jxy = cv2.GaussianBlur(gx * gy, (0, 0), si)
bg = cv2.GaussianBlur(cv2.dilate(I, np.ones((9, 9), np.uint8)), (0, 0), 3)
dk = np.clip(bg - I, 0, 255); ink = (dk >= 28).astype(np.float32)
Mf = M.astype(np.float32)
cov = cv2.GaussianBlur(ink * Mf, (0, 0), si) / np.maximum(1e-3, cv2.GaussianBlur(Mf, (0, 0), si))
dep = cv2.GaussianBlur(dk * ink * Mf, (0, 0), si) / np.maximum(1e-3, cv2.GaussianBlur(ink * Mf, (0, 0), si))
bgm = cv2.GaussianBlur(bg * Mf, (0, 0), si) / np.maximum(1e-3, cv2.GaussianBlur(Mf, (0, 0), si))
A = []
er = cv2.erode(M, np.ones((5, 5), np.uint8))
ys, xs = np.nonzero(er)
bx0, by0 = xs.min(), ys.min()
for y in range(by0 + sp // 2, ys.max(), sp):
    for x in range(bx0 + sp // 2, xs.max(), sp):
        if not er[y, x]: continue
        a, b, c = Jxx[y, x], Jyy[y, x], Jxy[y, x]
        th = 0.5 * np.arctan2(2 * c, a - b) + np.pi / 2   # stroke direction = across the dominant gradient
        l1 = 0.5 * (a + b) + np.sqrt(0.25 * (a - b) ** 2 + c * c); l2 = 0.5 * (a + b) - np.sqrt(0.25 * (a - b) ** 2 + c * c)
        coh = ((l1 - l2) / (l1 + l2 + 1e-6)) ** 2
        th = (th + np.pi / 2) % np.pi - np.pi / 2
        A.append([int(x), int(y), round(float(th), 3), round(float(coh), 2), round(float(cov[y, x]), 3), round(float(dep[y, x]), 1), round(float(pre(bgm[y, x], x, y)), 3)])
json.dump(A, open(out, 'w'))
print(len(A), 'anchors ->', out)
if '--viz' in sys.argv:
    vz = cv2.cvtColor(np.clip(I, 0, 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    for x, y, th, coh, cv, dp, bv in A:
        L = 8 + 14 * min(1, coh * 2); d = np.array([np.cos(th), np.sin(th)]) * L
        col = (0, int(255 * min(1, cv * 4)), 255 - int(255 * min(1, cv * 4)))
        cv2.line(vz, (int(x - d[0]), int(y - d[1])), (int(x + d[0]), int(y + d[1])), col, 2)
    ys2, xs2 = np.nonzero(M); cv2.imwrite(sys.argv[sys.argv.index('--viz') + 1], vz[max(0, ys2.min() - 10):ys2.max() + 10, max(0, xs2.min() - 10):xs2.max() + 10])
