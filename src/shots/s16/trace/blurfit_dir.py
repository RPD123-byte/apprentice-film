#!/usr/bin/env python3
# s16: the source's jolt / pull-back softness as an anisotropic Gaussian (sigma x, sigma y): the blur that best turns
# the steady source frame 1175 (moved by the frame's camera) into frame f on the room (owl, steam, eyes masked).
# Numbers only (-> s16.js BLUR).
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
import m16, cv2, numpy as np
cams = {}
for m in re.finditer(r'(\d+): \[([^\]]+)\]', open(os.path.join(os.path.dirname(__file__), '..', 'data', 'cams.js')).read()):
    cams[int(m.group(1))] = [float(v) for v in m.group(2).split(',')]
S0 = m16.pre(1175)
mask = np.zeros((m16.H, m16.W), bool)
mask[10:905, 1180:2150] = True; mask[330:720, 680:920] = False; mask[190:240, 1270:1550] = False
FR = [int(v) for v in sys.argv[1].split(',')] if len(sys.argv) > 1 else [1143, 1144, 1145, 1146, 1147, 1148, 1149, 1150, 1151, 1188, 1189, 1190, 1191, 1192]
for f in FR:
    Y = m16.pre(f)
    a, b, tx, c, d, ty = cams.get(f, [1, 0, 0, 0, 1, 0])
    R = cv2.warpAffine(S0, np.array([[a, b, tx], [c, d, ty]], np.float32), (m16.W, m16.H), flags=cv2.INTER_LINEAR)
    m = mask.copy()
    if f <= 1150: m[:, :1330] = False
    best = None
    for sx in np.arange(0, 3.01, 0.25):
        for sy in np.arange(0, 3.01, 0.25):
            Rb = cv2.GaussianBlur(R, (0, 0), sigmaX=max(0.01, sx), sigmaY=max(0.01, sy))
            e = np.abs(Rb - Y)[m].mean()
            if best is None or e < best[2]: best = (sx, sy, e)
    print(f, 'sigma x %.2f y %.2f  err %.4f' % best, flush=True)
