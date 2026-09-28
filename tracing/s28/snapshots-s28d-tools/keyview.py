# keyview.py key.json T out.jpg [x0 y0 x1 y1] -- overlay measured key parts on the source frame
import sys, json, cv2, numpy as np
from lib import src
K = json.load(open(sys.argv[1])); t = float(sys.argv[2]); f = src(t)
cols = [(0,255,255),(255,0,255),(0,255,0),(255,128,0),(0,128,255),(255,255,0),(128,0,255),(0,0,255)]
for i, (k, v) in enumerate(K.items()):
    c = cols[i % len(cols)]
    rings = v if (v and isinstance(v[0][0], list)) else [v]
    for r in rings:
        cv2.polylines(f, [np.array(r, np.int32)], k not in ('top', 'bottom') and not k.startswith('l_'), c, 2)
    r0 = rings[0][0]; cv2.putText(f, k, (int(r0[0]), int(r0[1])), 0, 0.6, c, 2)
if len(sys.argv) > 7:
    x0, y0, x1, y1 = map(int, sys.argv[4:8]); f = f[y0:y1, x0:x1]
cv2.imwrite(sys.argv[3], cv2.resize(f, None, fx=0.75, fy=0.75))
