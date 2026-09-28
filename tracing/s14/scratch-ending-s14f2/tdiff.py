# tdiff.py dirA dirB [ts]: per-tile blurred MAE (6x3) of A and B vs source, and B-A
import sys, cv2, numpy as np, glob, re
A, B = sys.argv[1], sys.argv[2]
ts = sys.argv[3].split(',') if len(sys.argv) > 3 else ['40', '40.16', '40.32', '40.48', '40.64']
def ld(d, t):
    f = glob.glob(f'{d}/frame-*-at-{t}s.png')[0]
    a = cv2.cvtColor(cv2.imread(f), cv2.COLOR_BGR2GRAY).astype(float); b = cv2.cvtColor(cv2.imread(f.replace('frame-', 'ref-')), cv2.COLOR_BGR2GRAY).astype(float)
    return cv2.GaussianBlur(a, (0, 0), 8), cv2.GaussianBlur(b, (0, 0), 8)
for t in ts:
    a, s = ld(A, t); b, _ = ld(B, t)
    H, W = a.shape; print(t, 'whole', round(np.abs(a - s).mean(), 2), '->', round(np.abs(b - s).mean(), 2))
    for j in range(3):
        row = []
        for i in range(6):
            y0, y1, x0, x1 = j * H // 3, (j + 1) * H // 3, i * W // 6, (i + 1) * W // 6
            ea = np.abs(a - s)[y0:y1, x0:x1].mean(); eb = np.abs(b - s)[y0:y1, x0:x1].mean(); bb = (b - s)[y0:y1, x0:x1].mean()
            row.append(f'{ea:4.1f}>{eb:4.1f}({bb:+5.1f})')
        print('  ', ' '.join(row))
