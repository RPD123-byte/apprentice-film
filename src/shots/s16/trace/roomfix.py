#!/usr/bin/env python3
# s16 room: light matching of the value study where this pass changed the drawing (data/roomfix.js).
# Usage: roomfix.py RAW.png [gain]   RAW = a raw (pre-grade) render of frame 1175 by the film's own code.
# The correction is kept in the work dir between rounds; only cells inside the region mask change.
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
import m16, cv2, numpy as np
M, CELL = m16.M, 16
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'roomfix.js')
WF = m16.ROOT + '/snapshots/s16-h1-work/roomfix.npy'
Hh, Ww = 946 + 2 * M, 2206 + 2 * M
nx, ny = (Ww + CELL - 1) // CELL, (Hh + CELL - 1) // CELL
F = np.load(WF) if os.path.exists(WF) else np.zeros((ny, nx), np.float32)
raw = cv2.imread(sys.argv[1], 0).astype(np.float32) / 255
gain = float(sys.argv[2]) if len(sys.argv) > 2 else 0.8
src = m16.pre(1175)
TSHIRT = [[1362, 648], [1362, 606], [1385, 611], [1410, 614], [1440, 610], [1465, 603], [1490, 602], [1512, 608], [1528, 625],
          [1534, 660], [1540, 700], [1550, 760], [1560, 810], [1566, 846], [1520, 846], [1453, 657], [1446, 650]]
reg = np.zeros((946, 2206), np.uint8)
cv2.fillPoly(reg, [np.array(TSHIRT, np.int32)], 1)
d = cv2.GaussianBlur(src, (0, 0), 4) - cv2.GaussianBlur(raw, (0, 0), 4)
ch = []
for j in range(ny):
    for i in range(nx):
        x0, y0 = i * CELL - M, j * CELL - M
        xa, ya, xb, yb = max(0, x0), max(0, y0), min(2206, x0 + CELL), min(946, y0 + CELL)
        if xb <= xa or yb <= ya: continue
        m = reg[ya:yb, xa:xb] > 0
        if m.sum() < CELL * CELL * 0.3: continue
        dd = float(d[ya:yb, xa:xb][m].mean())
        F[j, i] = np.clip(F[j, i] + gain * dd, -0.6, 0.6); ch.append(abs(dd))
np.save(WF, F)
print('roomfix: %d cells, mean |diff| %.4f' % (len(ch), np.mean(ch) if ch else 0))
with open(OUT, 'w') as f:
    f.write('// s16 room value-study corrections (written by src/shots/s16/trace/roomfix.py): additive, per 16 px cell of the plate\n')
    f.write('// (origin frame (-90, -90)), bilinear. Measured by light matching (blurred source vs blurred raw render) where this\n')
    f.write('// pass changed how the room is drawn (the knit T-shirt, whose tangle of traced lines was replaced by a mesh engraving).\n')
    f.write('export const FIX = { cell: %d, nx: %d, ny: %d, d: [%s] };\n' % (CELL, nx, ny, ','.join(('%.3f' % v).rstrip('0').rstrip('.') if v else '0' for v in F.ravel())))
