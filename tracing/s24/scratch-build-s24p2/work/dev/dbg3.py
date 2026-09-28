import sys, json; sys.path.insert(0, '.')
from common import *
from lines import rotate, rot_mats, runs_of
from lines3 import detect3
S = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24p2/'
u = U(40); th = 32.2
occ = np.zeros_like(u, np.uint8)
bars, R, O = detect3(u, occ, th)
# region in rotated coords around frame (150, 650)
_, _, (c, s, oy) = rot_mats(th)
x, y = 150, 650; uu = x * c + y * s; vv = -x * s + y * c + oy
u0, u1, v0, v1 = int(uu - 250), int(uu + 250), int(vv - 60), int(vv + 60)
crop = R[v0:v1, u0:u1]
# overlay bars
vis = cv2.cvtColor(np.clip(crop, 0, 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
vis = cv2.resize(vis, None, fx=3, fy=3, interpolation=cv2.INTER_NEAREST)
for b in bars:
    a0, b0, a1, b1, w, val, mass = b
    if max(a0, a1) < u0 or min(a0, a1) > u1 or max(b0, b1) < v0 or min(b0, b1) > v1: continue
    p = (int((a0 - u0) * 3), int((b0 - v0) * 3)); q = (int((a1 - u0) * 3), int((b1 - v0) * 3))
    cv2.line(vis, p, q, (0, 0, 255), 1)
    cv2.putText(vis, '%.1f/%d' % (w, val), (p[0], p[1] - 2), 0, 0.35, (0, 255, 255), 1)
cv2.imwrite(S + 'dbg3.png', vis)
