#!/usr/bin/env python3
# dpos.py TAKE rotoX.js frame: screen positions of the take's decals (slot centres) on that frame
import sys, re, json
import numpy as np, cv2
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s15-fix2/h')
from common import jsdata
take, rf, f = sys.argv[1], sys.argv[2], sys.argv[3]
d = jsdata('/Users/computer/rootline/apprentice-film/src/shots/s15/' + rf)
src = open('/Users/computer/rootline/apprentice-film/src/shots/s15/decals.js').read()
i = src.index(f'  {take}: {{'); j = src.index('\n  },', i)
body = src[i:j]
rows = {r[0]: r for r in d['frames'][f]}
for m in re.finditer(r'^\s+(\w+): \{wh:\[([\d.]+),([\d.]+)\],p1:\{(.*?)\}(?:,p2:\{(.*?)\})?\}', body, re.M):
    fid, w, h = m.group(1), float(m.group(2)), float(m.group(3))
    if fid not in rows: continue
    r = rows[fid]; q = np.float32(r[1:9]).reshape(4, 2)
    Hm = cv2.getPerspectiveTransform(np.float32([[0, 0], [1, 0], [1, 1], [0, 1]]), q)
    for tag, grp in (('p1', m.group(4)), ('p2', m.group(5))):
        if not grp: continue
        pm = re.search(r'"%s":\[([\d.]+),([\d.]+)\]' % f, grp)
        if not pm: continue
        u, v = float(pm.group(1)), float(pm.group(2))
        pts = cv2.perspectiveTransform(np.float32([[[u, v], [u - w / 2, v - h / 2], [u + w / 2, v + h / 2]]]), Hm)[0]
        print(fid, tag, 'centre', pts[0].round(0), 'box', pts[1].round(0), pts[2].round(0))
