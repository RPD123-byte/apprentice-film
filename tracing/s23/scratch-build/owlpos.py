import cv2, glob, re, sys, numpy as np
d = sys.argv[1]; t0 = float(sys.argv[2]) if len(sys.argv) > 2 else 103.0
fr = sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
x0, y0, x1, y1 = 900, 300, 1400, 910
def sil(g):
    r = g[y0:y1, x0:x1]
    m = (cv2.GaussianBlur(r, (0, 0), 3) > 175).astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(m)
    if n < 2: return None
    k = 1 + np.argmax(st[1:, 4]); mm = (lab == k)
    ys, xs = np.nonzero(mm)
    return mm, xs.mean() + x0, ys.mean() + y0, xs.min() + x0, xs.max() + x0, ys.min() + y0, ys.max() + y0, mm.sum()
print(' t     cxR   cxS   cyR   cyS   | bbox R (x0 x1 y0 y1)      | bbox S                 | areaR areaS IoU')
for p in fr:
    t = float(re.search(r'at-([\d.]+)s', p).group(1))
    if t < t0: continue
    a = cv2.imread(p, 0); b = cv2.imread(p.replace('frame-', 'ref-'), 0)
    A = sil(a); B = sil(b)
    if A is None or B is None: print(t, 'none'); continue
    iou = (A[0] & B[0]).sum() / max(1, (A[0] | B[0]).sum())
    print(f'{t:6.2f} {A[1]:6.0f}{B[1]:6.0f}{A[2]:6.0f}{B[2]:6.0f}   | {A[3]:5d}{A[4]:5d}{A[5]:5d}{A[6]:5d}   | {B[3]:5d}{B[4]:5d}{B[5]:5d}{B[6]:5d}  | {A[7]:6d}{B[7]:6d} {iou:.2f}')
