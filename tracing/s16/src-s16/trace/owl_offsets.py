#!/usr/bin/env python3
# s16: the seated owl's own drift in the pull-back (1186–1192), on top of the room camera: ECC translation of the
# owl's box on each source frame against frame 1175 moved by that frame's camera (data/cams.js). Numbers only;
# they are copied into owl.js OFF.
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
import m16, cv2, numpy as np
cams = {}
for m in re.finditer(r'(\d+): \[([^\]]+)\]', open(os.path.join(os.path.dirname(__file__), '..', 'data', 'cams.js')).read()):
    cams[int(m.group(1))] = [float(v) for v in m.group(2).split(',')]
R = m16.pre(1175); x0, y0, x1, y1 = 220, 540, 740, 930
for f in range(1186, 1193):
    Y = m16.pre(f); a, b, tx, c, d, ty = cams.get(f, [1, 0, 0, 0, 1, 0])
    A = cv2.GaussianBlur(cv2.warpAffine(R, np.array([[a, b, tx], [c, d, ty]], np.float32), (m16.W, m16.H))[y0:y1, x0:x1], (0, 0), 1.2)
    B = cv2.GaussianBlur(Y[y0:y1, x0:x1], (0, 0), 1.2)
    cc, w = cv2.findTransformECC(A, B, np.eye(2, 3, dtype=np.float32), cv2.MOTION_TRANSLATION,
                                 (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), None, 5)
    print(f, 'dx %.2f dy %.2f cc %.4f' % (w[0, 2], w[1, 2], cc))
