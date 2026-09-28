# owlm.py DIR [frames]: late-owl footprint metrics, render vs source: high-pass energy ratio (σ0.7−σ3 band std),
# σ0.7 / σ1.5 MAE, owl p50 white (render/source)
import sys, glob, re, json, cv2, numpy as np
sys.path.insert(0, '.')
from run import src, gray
SP = __import__('os').path.dirname(__import__('os').path.abspath(__file__))   # boxes.json (from boxes.mjs) lives here
BX = json.load(open(f'{SP}/boxes.json'))
d = sys.argv[1]
Fs = [int(v) for v in sys.argv[2].split(',')] if len(sys.argv) > 2 else sorted(int(re.search(r'r(\d+)\.png', p).group(1)) for p in glob.glob(f'{d}/r*.png'))
acc = []
for F in Fs:
    if str(F) not in BX: continue
    b = BX[str(F)]; a, bb, c, dd, e, f = b['m']; o = b['o']
    corners = [(o[0], o[1]), (o[0] + b['w'], o[1]), (o[0], o[1] + b['h']), (o[0] + b['w'], o[1] + b['h'])]
    xs = [a * u + c * v + e for u, v in corners]; ys = [bb * u + dd * v + f for u, v in corners]
    x0, x1, y0, y1 = max(0, int(min(xs))), min(2206, int(max(xs)) + 1), max(0, int(min(ys))), min(946, int(max(ys)) + 1)
    A = gray(cv2.imread(f'{d}/r{F:04d}.png'))[y0:y1, x0:x1]; B = gray(src(F))[y0:y1, x0:x1]
    sa, sb = cv2.GaussianBlur(A, (0, 0), 2), cv2.GaussianBlur(B, (0, 0), 2)
    m = ((sa > 140) | (sb > 140)).astype(np.uint8)
    m = cv2.dilate(m, np.ones((5, 5), np.uint8)) > 0
    band = lambda X: cv2.GaussianBlur(X, (0, 0), 0.7) - cv2.GaussianBlur(X, (0, 0), 3)
    ha, hb = band(A)[m].std(), band(B)[m].std()
    e07 = np.abs(cv2.GaussianBlur(A, (0, 0), 0.7) - cv2.GaussianBlur(B, (0, 0), 0.7))[m].mean()
    e15 = np.abs(cv2.GaussianBlur(A, (0, 0), 1.5) - cv2.GaussianBlur(B, (0, 0), 1.5))[m].mean()
    ow = (sa > 150) & (sb > 150)
    inn = cv2.erode(ow.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    ia, ib = band(A)[inn].std(), band(B)[inn].std()
    ei = np.abs(cv2.GaussianBlur(A, (0, 0), 0.7) - cv2.GaussianBlur(B, (0, 0), 0.7))[inn].mean()
    pa, pb = (np.percentile(A[ow], 50), np.percentile(B[ow], 50)) if ow.sum() > 50 else (0, 0)
    acc.append((ha / hb, e07, e15, ia / ib, ei))
    print(f'{F} {b["name"]:6} hp {ha:5.2f}/{hb:5.2f}={ha/hb:4.2f}  e0.7 {e07:5.2f}  e1.5 {e15:5.2f}  p50 {pa:.0f}/{pb:.0f}  inner hp {ia:5.2f}/{ib:5.2f}={ia/ib:4.2f} e0.7 {ei:5.2f}')
if acc: print('mean hp %.3f e0.7 %.2f e1.5 %.2f | inner hp %.3f e0.7 %.2f' % tuple(np.mean(acc, 0)))
