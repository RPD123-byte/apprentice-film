# poolfit.py DIR: fit the missing top-margin light above the card as alpha * blur(card mask, sigma) (outside the screen)
import sys, re, glob, cv2, numpy as np
sys.path.insert(0, '.')
from run import src, gray
exec(open("cardprof.py").read().split("d = sys.argv[1]")[0])
d = sys.argv[1]
Fs = [F for F in sorted(int(re.search(r'r(\d+)\.png', p).group(1)) for p in glob.glob(f'{d}/r*.png')) if 2036 <= F <= 2100]
Rs, Ss, Ms, Cs = [], [], [], []
for F in Fs:
    r = gray(cv2.imread(f'{d}/r{F:04d}.png')); s = gray(src(F))
    bright = cv2.dilate(((r > 120) | (s > 120)).astype(np.uint8), np.ones((41, 41), np.uint8)) > 0
    D = cv2.GaussianBlur(s, (0, 0), 6) - cv2.GaussianBlur(r, (0, 0), 6)
    m = np.zeros_like(bright); m[4:122, 150:2016] = True; m &= ~bright
    cm = np.zeros(r.shape, np.float32); cv2.fillPoly(cm, [np.round(card(F) * 8).astype(np.int32)], 1.0, lineType=cv2.LINE_AA, shift=3)
    Rs.append(D); Ms.append(m); Cs.append(cm)
res = {}
for sig in [90, 110, 130, 160]:
    Bs = [cv2.GaussianBlur(cm, (0, 0), sig, borderType=cv2.BORDER_CONSTANT) for cm in Cs]
    x = np.concatenate([B[m] for B, m in zip(Bs, Ms)]); y = np.concatenate([D[m] for D, m in zip(Rs, Ms)])
    a = (x * y).sum() / (x * x).sum()
    e0 = np.abs(y).mean(); e1 = np.abs(y - a * x).mean()
    print(f'sigma {sig}: alpha {a:.1f}  |resid| {e0:.3f} -> {e1:.3f}')
# two-term: near + far
B1 = [cv2.GaussianBlur(cm, (0, 0), 56) for cm in Cs]; B2 = [cv2.GaussianBlur(cm, (0, 0), 208) for cm in Cs]
X = np.stack([np.concatenate([B[m] for B, m in zip(B1, Ms)]), np.concatenate([B[m] for B, m in zip(B2, Ms)])], 1)
y = np.concatenate([D[m] for D, m in zip(Rs, Ms)])
c, *_ = np.linalg.lstsq(X, y, rcond=None); print('two-term 56/208:', c, np.abs(y - X @ c).mean())
# weighted card: mask * u^p (u along the card from its left edge to its right edge)
yy, xx = np.mgrid[0:946, 0:2206].astype(np.float32)
def wcard(F, p):
    c = card(F); xl = (c[0, 0] + c[3, 0]) / 2; xr = (c[1, 0] + c[2, 0]) / 2
    u = np.clip((xx - xl) / max(1, xr - xl), 0, 1)
    cm = np.zeros((946, 2206), np.float32); cv2.fillPoly(cm, [np.round(c * 8).astype(np.int32)], 1.0, lineType=cv2.LINE_AA, shift=3)
    return cm * u ** p
y = np.concatenate([D[m] for D, m in zip(Rs, Ms)])
for sig in [100, 130]:
    for p in [1, 2, 4]:
        B1 = [cv2.GaussianBlur(cm, (0, 0), sig) for cm in Cs]
        B2 = [cv2.GaussianBlur(wcard(F, p), (0, 0), sig) for F in Fs]
        X = np.stack([np.concatenate([B[m] for B, m in zip(B1, Ms)]), np.concatenate([B[m] for B, m in zip(B2, Ms)])], 1)
        c, *_ = np.linalg.lstsq(X, y, rcond=None); print(f'sig {sig} p {p}: coef', c.round(1), 'resid %.3f' % np.abs(y - X @ c).mean())
        x2 = X[:, 1]; a = (x2 * y).sum() / (x2 * x2).sum(); print('   weighted only: a %.1f resid %.3f' % (a, np.abs(y - a * x2).mean()))
