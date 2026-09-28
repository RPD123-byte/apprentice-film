# check the plane model: warp the source at t0 by the plane homography to t1 and blend with the source at t1
import sys, cv2, numpy as np
from lib import src
import cam as C
t0, t1, pl, out = float(sys.argv[1]), float(sys.argv[2]), sys.argv[3], sys.argv[4]
P = getattr(C, pl)
Hm = C.H_plane(t0, t1, P)
a = src(t0); b = src(t1)
w = cv2.warpPerspective(a, Hm, (2206, 946))
e1 = cv2.Canny(cv2.cvtColor(w, cv2.COLOR_BGR2GRAY), 60, 150)
e2 = cv2.Canny(cv2.cvtColor(b, cv2.COLOR_BGR2GRAY), 60, 150)
o = np.zeros_like(b); o[..., 2] = e1; o[..., 1] = e2
o = cv2.addWeighted(o, 1.0, (b * 0.35).astype(np.uint8), 1.0, 0)
cv2.imwrite(out, o)
