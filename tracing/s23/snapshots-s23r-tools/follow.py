#!/usr/bin/env python3
# follow.py out.jpg cols W H k:cx:cy ...   tiles of the source cropped round a moving point
import sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s23r-tools')
from m import src
out = sys.argv[1]; cols = int(sys.argv[2]); W = int(sys.argv[3]); H = int(sys.argv[4]); tiles = []
for a in sys.argv[5:]:
    k, cx, cy = [float(v) for v in a.split(':')]; k = int(k)
    f = cv2.copyMakeBorder(src(k), 400, 400, 400, 400, cv2.BORDER_CONSTANT)
    x0 = int(cx - W / 2) + 400; y0 = int(cy - H / 2) + 400
    t = f[y0:y0 + H, x0:x0 + W].copy(); cv2.putText(t, '%.2f' % (k / 25), (3, 14), 0, 0.45, (0, 255, 255), 1); tiles.append(t)
while len(tiles) % cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out, np.vstack([np.hstack(tiles[i:i + cols]) for i in range(0, len(tiles), cols)]), [cv2.IMWRITE_JPEG_QUALITY, 88])
