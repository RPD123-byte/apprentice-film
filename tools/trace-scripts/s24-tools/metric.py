# mean |render - source| (luminance) after Gaussian blur, at 1/4 size (σ in 1/4-size px) and at full size σ1
import cv2, glob, re, sys, numpy as np
d = sys.argv[1]
fs = sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
tot = []
for f in fs:
    t = float(re.search(r'at-([\d.]+)s', f).group(1)); r = f.replace('frame-', 'ref-')
    a = cv2.imread(f, 0).astype(np.float32); b = cv2.imread(r, 0).astype(np.float32)
    if b.shape != a.shape: b = cv2.resize(b, (a.shape[1], a.shape[0]), interpolation=cv2.INTER_AREA)
    e1 = np.abs(cv2.GaussianBlur(a, (0, 0), 1) - cv2.GaussianBlur(b, (0, 0), 1)).mean()
    qa = cv2.resize(a, None, fx=.25, fy=.25, interpolation=cv2.INTER_AREA); qb = cv2.resize(b, None, fx=.25, fy=.25, interpolation=cv2.INTER_AREA)
    e2 = np.abs(cv2.GaussianBlur(qa, (0, 0), 2) - cv2.GaussianBlur(qb, (0, 0), 2)).mean()
    e8 = np.abs(cv2.GaussianBlur(qa, (0, 0), 8) - cv2.GaussianBlur(qb, (0, 0), 8)).mean()
    k = round((t - 96.8) / 0.04)
    print('%.3f k%02d  mean r %5.1f s %5.1f  σ1 %5.1f  σ2(¼) %5.1f  σ8(¼) %5.1f' % (t, k, a.mean(), b.mean(), e1, e2, e8))
    tot.append(e8)
print('mean σ8', np.mean(tot))
