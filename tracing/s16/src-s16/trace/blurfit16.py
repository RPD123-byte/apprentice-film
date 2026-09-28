#!/usr/bin/env python3
# s16: how soft is each jolt / pull-back frame? Fit the Gaussian blur that best turns the film's own sharp room
# (a raw render of the steady frame, moved by the frame's camera) into the source frame, on the room only (owl box,
# steam and eyes masked), per region. Numbers only (-> s16.js BLUR).
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
import m16, cv2, numpy as np
raw = cv2.imread(sys.argv[1], 0).astype(np.float32) / 255      # raw (pre-grade) room-only render at the steady framing
cams = {}
for m in re.finditer(r'(\d+): \[([^\]]+)\]', open(os.path.join(os.path.dirname(__file__), '..', 'data', 'cams.js')).read()):
    cams[int(m.group(1))] = [float(v) for v in m.group(2).split(',')]
REG = {'desk': (1500, 850, 2150, 905), 'beanie': (1250, 10, 1580, 100), 'shirtR': (1580, 450, 1850, 740), 'books': (1700, 760, 2150, 845), 'hpR': (1500, 420, 1640, 640)}
for f in [1143, 1144, 1145, 1146, 1147, 1148, 1149, 1150, 1151, 1152, 1175, 1188, 1189, 1190, 1191, 1192]:
    Y = m16.pre(f)
    a, b, tx, c, d, ty = cams.get(f, [1, 0, 0, 0, 1, 0])
    R = cv2.warpAffine(raw, np.array([[a, b, tx], [c, d, ty]], np.float32), (m16.W, m16.H), flags=cv2.INTER_LINEAR)
    out = []
    for k, (x0, y0, x1, y1) in REG.items():
        best = None
        for s in [0, 0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.8]:
            Rb = cv2.GaussianBlur(R, (0, 0), s) if s > 0 else R
            e = np.abs(cv2.GaussianBlur(Rb[y0:y1, x0:x1], (0, 0), 0.7) - cv2.GaussianBlur(Y[y0:y1, x0:x1], (0, 0), 0.7)).mean()
            if best is None or e < best[1]: best = (s, e)
        out.append('%s %.1f' % (k, best[0]))
    print(f, '  '.join(out))
