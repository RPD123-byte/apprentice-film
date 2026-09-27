#!/usr/bin/env python3
# s16: the source's own softness per jolt / pull-back frame: the Gaussian blur that best turns the steady source frame
# 1175 (moved by the frame's camera) into frame f, per region of the room (numbers only). Also the ratio of fine detail
# (DoG 0.7-2 px) kept.
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
import m16, cv2, numpy as np
cams = {}
for m in re.finditer(r'(\d+): \[([^\]]+)\]', open(os.path.join(os.path.dirname(__file__), '..', 'data', 'cams.js')).read()):
    cams[int(m.group(1))] = [float(v) for v in m.group(2).split(',')]
S0 = m16.pre(1175)
REG = {'deskR': (1500, 850, 2150, 905), 'deskL': (900, 850, 1400, 905), 'beanie': (1250, 10, 1580, 100), 'shirtR': (1580, 450, 1850, 740), 'books': (1700, 760, 2150, 845), 'hpR': (1500, 420, 1640, 640)}
band = lambda x: cv2.GaussianBlur(x, (0, 0), 0.7) - cv2.GaussianBlur(x, (0, 0), 2.0)
for f in [1143, 1144, 1145, 1146, 1147, 1148, 1149, 1150, 1151, 1152, 1188, 1189, 1190, 1191, 1192]:
    Y = m16.pre(f)
    a, b, tx, c, d, ty = cams.get(f, [1, 0, 0, 0, 1, 0])
    R = cv2.warpAffine(S0, np.array([[a, b, tx], [c, d, ty]], np.float32), (m16.W, m16.H), flags=cv2.INTER_LINEAR)
    out = []; allb = []
    for k, (x0, y0, x1, y1) in REG.items():
        best = None
        for s in np.arange(0, 2.51, 0.1):
            Rb = cv2.GaussianBlur(R, (0, 0), s) if s > 0 else R
            e = np.abs(Rb[y0:y1, x0:x1] - Y[y0:y1, x0:x1]).mean()
            if best is None or e < best[1]: best = (s, e)
        keep = band(Y)[y0:y1, x0:x1].std() / band(R)[y0:y1, x0:x1].std()
        out.append('%s %.1f (%.2f)' % (k, best[0], keep)); allb.append(best[0])
    print(f, 'median %.2f |' % np.median(allb), '  '.join(out))
