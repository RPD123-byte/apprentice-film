#!/usr/bin/env python3
# measure_wings.py JSON -> src/shots/s02/wings.js : per frame 400..478 the two wing outlines in owl units (integers,
# delta-coded): [L..., R...] as [n, x0, y0, dx, dy, ...]
import json, sys
res = json.load(open(sys.argv[1])); out = sys.argv[2]
def enc(q):
    q = [[int(round(x)), int(round(y))] for x, y in q]
    a = [len(q), q[0][0], q[0][1]]
    for (x0, y0), (x1, y1) in zip(q, q[1:]): a += [x1 - x0, y1 - y0]
    return a
rows = []
for r in res:
    rows.append('[' + ','.join(map(str, enc(r['L']) + enc(r['R']))) + ']')
hdr = """// s02 owl in flight: the two wing silhouettes of every SOURCE frame 15.88-19.12 s (frames 397..478), MEASURED by
// src/shots/s02/trace/measure_wings.py (each frame warped into the owl's own frame with the measured root track, the
// white owl segmented, the body removed, outlines simplified to 1.5 units) + tojs_wings.py. Owl units (root at the
// origin, bank removed; the drawing adds the frame's root, scale and bank). Left-wing frames 414-419, 421, 422
// (merged with the lit cartons) are the right wing mirrored; right-wing frame 437 is a morph. Outlines only.
// Row = [nL, x0, y0, dx, dy, ..., nR, x0, y0, dx, dy, ...]
export const WING_F0 = 397;
export const WINGS = [
"""
body = hdr + ',\n'.join(rows) + '\n];\n'
# the interiors (measure_wings.py *-ink.json): per frame [L levels, R levels], level = shapes
# [v*1000, nRings, len, x0, y0, dx, dy, ...] in owl units
import os
inkp = sys.argv[1].replace('.json', '-ink.json')
if os.path.exists(inkp):
    INK = json.load(open(inkp))
    def encs(sh):
        a = [int(round(sh['v'] * 1000)), len(sh['r'])]
        for q in sh['r']:
            q = [[int(round(x)), int(round(y))] for x, y in q]
            a.append(len(q)); a += q[0]
            for (x0, y0), (x1, y1) in zip(q, q[1:]): a += [x1 - x0, y1 - y0]
        return '[' + ','.join(map(str, a)) + ']'
    fr = []
    for r in res:
        I = INK[str(r['f'])]
        fr.append('[' + ','.join('[' + ','.join('[' + ','.join(encs(sh) for sh in lev) + ']' for lev in I[side]) + ']' for side in ('L', 'R')) + ']')
    body += '// wing interiors per frame: brightness levels inside each outline, traced on the warped frame (measure_wings.py)\nexport const WING_INK = [\n' + ',\n'.join(fr) + '\n];\n'
open(out, 'w').write(body)
print(len(body) // 1024, 'KB')
print(len(rows), 'frames')
