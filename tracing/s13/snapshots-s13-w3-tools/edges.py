# edges.py OUT side y0 y1 step x0 x1 frames... : first lit x (blur1 > 90) scanning from x0 toward x1 per row; render - source
import cv2, numpy as np, sys
out, side = sys.argv[1], sys.argv[2]; y0, y1, st, x0, x1 = map(int, sys.argv[3:8]); fr = [int(f) for f in sys.argv[8:]]
S = '/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src'
def edge(I, y):
    row = I[y, min(x0, x1):max(x0, x1)]; idx = np.where(row > 90)[0]
    if not len(idx): return None
    return min(x0, x1) + (idx[0] if x0 < x1 else idx[-1])
for f in fr:
    r = cv2.GaussianBlur(cv2.imread(f'{out}/r{f}.png', 0).astype(np.float32), (0, 0), 1); s = cv2.GaussianBlur(cv2.imread(f'{S}/f{f}.png', 0).astype(np.float32), (0, 0), 1)
    row = []
    for y in range(y0, y1, st):
        a, b = edge(r, y), edge(s, y)
        row.append(f'{y}:' + ('--' if a is None or b is None else f'{a-b:+d}'))
    print(f, ' '.join(row))
