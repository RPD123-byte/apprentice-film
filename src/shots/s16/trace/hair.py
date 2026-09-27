#!/usr/bin/env python3
# s16 fix 1: the loose hair strands on his right (below the beanie's right side): pale centre-lines measured on the
# clean plate (build_plate.py; the s12 method), redrawn in room.js as tapered strands over a flat dark ground
# -> data/hair.js (geometry: [x, y, width, value] per point)
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
import m16, cv2, numpy as np
E = m16.plateE(); M = m16.M
ZONE = [[1545, 150], [1590, 170], [1618, 200], [1640, 260], [1640, 340], [1560, 340], [1548, 260]]
x0, y0, x1, y1 = 1530, 140, 1660, 350
Y = E[M + y0:M + y1, M + x0:M + x1]
z = np.zeros(Y.shape, np.uint8); cv2.fillPoly(z, [np.array(ZONE, np.int32) - [x0, y0]], 1)
S = m16.strokes(Y, 'pale', mask=z, sigmas=(0.8, 1.2), hi=0.03, lo=0.012, dmin=0.04, minlen=8, eps=0.5, smooth=3, win=9, off=(x0, y0))
S = [[[p[0], p[1], round(min(2.5, max(0.9, p[2] * 0.8)), 1), p[3]] for p in s] for s in S]
out = os.path.join(os.path.dirname(__file__), '..', 'data', 'hair.js')
open(out, 'w').write('// s16 hair strands on his right (src/shots/s16/trace/hair.py): pale centre-lines [x, y, w, v, ...]\n'
                     'export const HAIRZ = %s;\nexport const HAIRS = [%s];\n' % (json.dumps(ZONE), m16.js_strokes(S)))
print(len(S), 'strands')
