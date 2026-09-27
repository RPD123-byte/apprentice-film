#!/usr/bin/env python3
# s16 fix 1: the knit T-shirt's light as a coarse value study (source frame 1175 pre-grade, sigma 4, sampled on an 8 px
# grid over the shirt's outline; values only, 2 decimals) -> data/shirt.js. room.js paints the knit from it: a hex
# lattice of pale cells on dark, the cells sized so the lattice's mean matches this light.
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
import m16, cv2, numpy as np
m16.PRE = m16.ROOT + '/snapshots/s16-fix1-src'
X0, Y0, C, NX, NY = 1352, 596, 8, 32, 33
P = m16.pre(1175)
T = [[1362, 648], [1362, 606], [1385, 611], [1410, 614], [1440, 610], [1465, 603], [1490, 602], [1512, 608], [1528, 625], [1534, 660],
     [1540, 700], [1550, 760], [1560, 810], [1566, 846], [1520, 846], [1453, 657], [1446, 650]]
T2 = [[1550, 628], [1560, 624], [1580, 628], [1592, 634], [1588, 650], [1578, 660], [1570, 680], [1562, 700], [1552, 705], [1548, 680], [1549, 650]]
m = np.zeros(P.shape, np.uint8); cv2.fillPoly(m, [np.array(T, np.int32), np.array(T2, np.int32)], 1)
mc = cv2.erode(m, np.ones((3, 3), np.uint8)).astype(np.float32)
B = cv2.GaussianBlur(P * mc, (0, 0), 4) / np.maximum(1e-3, cv2.GaussianBlur(mc, (0, 0), 4))
G = [[round(float(np.clip(B[min(945, Y0 + j * C), X0 + i * C], 0, 1)), 2) for i in range(NX)] for j in range(NY)]
out = os.path.join(os.path.dirname(__file__), '..', 'data', 'shirt.js')
open(out, 'w').write('// s16 knit T-shirt light (src/shots/s16/trace/shirt.py): value at x = SX0 + 8 i, y = SY0 + 8 j (coarse, sigma 4)\n'
                     'export const SX0 = %d, SY0 = %d, SC = %d, SHIRTG = %s;\n' % (X0, Y0, C, json.dumps(G)))
print('wrote', out)
