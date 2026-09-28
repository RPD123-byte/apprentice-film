# metrics.py DIR [--cells] [x0 y0 x1 y1]
import cv2, glob, sys, re, numpy as np
d = sys.argv[1]; cells = '--cells' in sys.argv
roi = [int(v) for v in sys.argv[2:] if v.lstrip('-').isdigit()]
fs = sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
for f in fs:
    t = float(re.search(r'at-([\d.]+)s', f).group(1))
    a = cv2.cvtColor(cv2.imread(f), cv2.COLOR_BGR2GRAY).astype(np.float32)
    b = cv2.cvtColor(cv2.imread(f.replace('frame-', 'ref-')), cv2.COLOR_BGR2GRAY).astype(np.float32)
    ab, bb = cv2.GaussianBlur(a, (0, 0), 8), cv2.GaussianBlur(b, (0, 0), 8)
    if len(roi) == 4:
        x0, y0, x1, y1 = roi; a, b, ab, bb = a[y0:y1, x0:x1], b[y0:y1, x0:x1], ab[y0:y1, x0:x1], bb[y0:y1, x0:x1]
    la = np.abs(cv2.Laplacian(cv2.GaussianBlur(a, (0, 0), 1), cv2.CV_32F)).mean(); lb = np.abs(cv2.Laplacian(cv2.GaussianBlur(b, (0, 0), 1), cv2.CV_32F)).mean()
    print(f"{t:6.2f} mean {a.mean():6.1f}/{b.mean():6.1f}  blurMAE {np.abs(ab-bb).mean():5.1f}  p50 {np.percentile(a,50):4.0f}/{np.percentile(b,50):4.0f} p95 {np.percentile(a,95):4.0f}/{np.percentile(b,95):4.0f} p99 {np.percentile(a,99):4.0f}/{np.percentile(b,99):4.0f}  lap {la:4.2f}/{lb:4.2f}")
    if cells:
        H, W = a.shape; rows = []
        for j in range(4):
            r = []
            for i in range(8):
                ys, xs = slice(j*H//4, (j+1)*H//4), slice(i*W//8, (i+1)*W//8)
                r.append(f"{a[ys,xs].mean()-b[ys,xs].mean():+5.0f}")
            rows.append(' '.join(r))
        print('      ' + '\n      '.join(rows))
