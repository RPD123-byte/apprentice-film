import re, cv2, numpy as np, sys
from lib import src
js = open('../../src/shots/s28/data.js').read()
L = eval(re.search(r'export const LIDQ = (\[\[.*?\]\]);', js, re.S).group(1))
tiles = []
for t in [129.32, 129.6, 129.88, 130.12, 130.4, 130.72, 131.0, 131.36]:
    row = min(L, key=lambda r: abs(r[0] - t))
    f = src(t)
    q = np.array(row[1:9]).reshape(4, 2)
    cv2.polylines(f, [q.astype(np.int32)], True, (0, 0, 255), 2)
    cv2.putText(f, f"{t}", (20, 60), 0, 2, (0, 255, 255), 3)
    tiles.append(cv2.resize(f, (1103, 473)))
im = np.vstack([np.hstack(tiles[i:i + 2]) for i in range(0, 8, 2)])
cv2.imwrite('../s28d-study/chklid.jpg', im)
print(len(L), L[0][0], L[-1][0])
