# blocks.py OUT f0 f1 [bs] : where the sigma-8 |render - source| lives (mean over frames), top blocks + share of total
import cv2, numpy as np, sys
out, f0, f1 = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); bs = int(sys.argv[4]) if len(sys.argv) > 4 else 60
acc = None; accs = None
for f in range(f0, f1 + 1):
    r = cv2.imread(f'{out}/r{f}.png', 0).astype(np.float32); s = cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src/f{f}.png', 0).astype(np.float32)
    d = cv2.GaussianBlur(r, (0, 0), 8) - cv2.GaussianBlur(s, (0, 0), 8)
    acc = d if acc is None else acc + d
    accs = np.abs(d) if accs is None else accs + np.abs(d)
n = f1 - f0 + 1; acc /= n; accs /= n
H, W = acc.shape; tot = accs.sum()
L = []
for y in range(0, H, bs):
    for x in range(0, W, bs):
        L.append((accs[y:y + bs, x:x + bs].sum() / tot, x, y, acc[y:y + bs, x:x + bs].mean(), accs[y:y + bs, x:x + bs].mean()))
L.sort(reverse=True)
print(f'total mean |d| {accs.mean():.2f}; top blocks ({bs}px): share  x  y  mean(d)  mean|d|')
cum = 0
for sh, x, y, m, a in L[:30]:
    cum += sh; print(f'{sh*100:5.1f}% (cum {cum*100:5.1f})  {x:4d} {y:4d}  {m:+6.2f} {a:5.2f}')
