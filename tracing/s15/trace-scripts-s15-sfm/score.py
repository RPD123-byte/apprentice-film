# per-frame error: blurred MAE (structure/value) and mean luma, render vs source
import cv2, numpy as np, glob, re, sys
d = sys.argv[1]
rows = []
for fp in sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1))):
    t = float(re.search(r'at-([\d.]+)s', fp).group(1))
    rp = fp.replace('frame-', 'ref-')
    a = cv2.imread(fp, 0).astype(np.float32); b = cv2.imread(rp, 0).astype(np.float32)
    if a.shape != b.shape: b = cv2.resize(b, (a.shape[1], a.shape[0]))
    ab = cv2.GaussianBlur(a, (0, 0), 12); bb = cv2.GaussianBlur(b, (0, 0), 12)
    e = np.abs(ab - bb).mean()
    # edge-structure similarity: correlation of gradient magnitudes at a coarse scale
    def gm(x):
        x = cv2.GaussianBlur(x, (0, 0), 3); gx = cv2.Sobel(x, cv2.CV_32F, 1, 0); gy = cv2.Sobel(x, cv2.CV_32F, 0, 1); return cv2.GaussianBlur(np.hypot(gx, gy), (0, 0), 6)
    ga, gb = gm(a), gm(b)
    c = np.corrcoef(ga.ravel()[::7], gb.ravel()[::7])[0, 1]
    rows.append((t, e, c, a.mean(), b.mean()))
for t, e, c, ma, mb in rows: print(f'{t:6.2f} blurMAE={e:5.1f} gradCorr={c:+.2f} luma r/s={ma:5.1f}/{mb:5.1f}')
E = np.array([r[1] for r in rows]); C = np.array([r[2] for r in rows])
print(f'MEAN blurMAE={E.mean():.1f} gradCorr={C.mean():.3f} lumaR={np.mean([r[3] for r in rows]):.1f} lumaS={np.mean([r[4] for r in rows]):.1f}')
