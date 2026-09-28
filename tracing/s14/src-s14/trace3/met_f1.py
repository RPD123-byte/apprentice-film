# fix pass 1: per-frame errors of a compare dir (blurred sigma-8 MAE, mean, percentiles, near-black, high-pass): met_f1.py dir [tiles]
import cv2, numpy as np, glob, re, sys
d = sys.argv[1]; tiles = len(sys.argv) > 2
fs = sorted(glob.glob(d + '/frame-*.png'), key=lambda f: float(re.search(r'at-([\d.]+)s', f).group(1)))
tot = []
for f in fs:
    t = re.search(r'at-([\d.]+)s', f).group(1)
    a = cv2.cvtColor(cv2.imread(f), cv2.COLOR_BGR2GRAY).astype(float); b = cv2.cvtColor(cv2.imread(f.replace('frame-', 'ref-')), cv2.COLOR_BGR2GRAY).astype(float)
    A = cv2.GaussianBlur(a, (0, 0), 8); B = cv2.GaussianBlur(b, (0, 0), 8)
    e = np.abs(A - B).mean(); tot.append(e)
    hp = lambda x: np.abs(x - cv2.GaussianBlur(x, (0, 0), 2)).mean()
    pa = np.percentile(a, [10, 25, 50, 75, 90, 95]).round(); pb = np.percentile(b, [10, 25, 50, 75, 90, 95]).round()
    print(f'{t:6s} blur8 {e:5.1f} mean {a.mean():5.1f}/{b.mean():5.1f} p {pa.astype(int).tolist()} / {pb.astype(int).tolist()} blk {(a<8).mean():.3f}/{(b<8).mean():.3f} hp {hp(a):.1f}/{hp(b):.1f}')
    if tiles:
        H, W = a.shape; ny, nx = 3, 6
        for j in range(ny):
            row = []
            for i in range(nx):
                y0, y1, x0, x1 = j * H // ny, (j + 1) * H // ny, i * W // nx, (i + 1) * W // nx
                row.append(f'{(A[y0:y1, x0:x1] - B[y0:y1, x0:x1]).mean():+6.1f}|{np.abs(A[y0:y1, x0:x1] - B[y0:y1, x0:x1]).mean():4.1f}')
            print('   ', ' '.join(row))
print('avg blur8', round(sum(tot) / max(1, len(tot)), 2))
