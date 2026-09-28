# Rasterise a traced key (room or designer) from its polygon data, for inspection: rastkey.py KEY.js OUT.png [crop]
import re, sys, json, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/tools/trace-scripts/s27t-tools')
from codec import dec
s = open(sys.argv[1]).read(); vals = {}
for n in re.findall(r'export const (\w+) = ', s):
    m = re.search(r'export const %s = (.*?);\n' % n, s, re.S); vals[n] = json.loads(m.group(1))
REG = [v for k, v in vals.items() if k.endswith('_REGIONS')][0]; INK = [v for k, v in vals.items() if k.endswith('_INK')][0]
OUT = [v for k, v in vals.items() if k.endswith('_OUTLINE')]
im = np.zeros((946, 2206, 3), np.uint8); im[:] = (255, 0, 255)
P = lambda p: np.int32(np.round(np.array(dec(p), float).reshape(-1, 2) / 2))
hexc = lambda c: (int(c[5:7], 16), int(c[3:5], 16), int(c[1:3], 16))
for r in REG:
    m = np.zeros((946, 2206), np.uint8); cv2.fillPoly(m, [P(r[1])], 1)
    for h in r[2:]: cv2.fillPoly(m, [P(h)], 0)
    im[m > 0] = hexc(r[0])
for g in INK:
    for poly in g[1:]:
        m = np.zeros((946, 2206), np.uint8); cv2.fillPoly(m, [P(poly[0])], 1)
        for h in poly[1:]: cv2.fillPoly(m, [P(h)], 0)
        im[m > 0] = hexc(g[0])
if OUT: cv2.polylines(im, [P(OUT[0])], True, (0, 255, 0), 1)
if len(sys.argv) > 3:
    x0, y0, x1, y1 = map(int, sys.argv[3].split(',')); im = cv2.resize(im[y0:y1, x0:x1], None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST)
cv2.imwrite(sys.argv[2], im)
