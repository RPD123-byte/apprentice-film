# artifacts.py OUT [f0 f1]: blobs where one image is lit and the other is black (render lit / source lit), > 25 px
import cv2, numpy as np, sys
out = sys.argv[1]; f0, f1 = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (884, 922)
import os
for f in range(f0, f1 + 1):
    if not os.path.exists(f"{out}/r{f}.png"): continue
    r = cv2.GaussianBlur(cv2.imread(f'{out}/r{f}.png', 0).astype(np.float32), (0, 0), 1.5)
    s = cv2.GaussianBlur(cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src/f{f}.png', 0).astype(np.float32), (0, 0), 1.5)
    res = []
    for name, m in [('R+', (r > 70) & (s < 30)), ('S+', (s > 70) & (r < 30))]:
        m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        n, lab, st, cen = cv2.connectedComponentsWithStats(m)
        for i in range(1, n):
            if st[i, 4] >= 25: res.append(f'{name} {st[i,0]},{st[i,1]} {st[i,2]}x{st[i,3]} a{st[i,4]}')
    print(f, '; '.join(res))
