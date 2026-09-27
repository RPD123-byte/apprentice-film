#!/usr/bin/env python3
# trace_room.py JSON -> src/shots/s02/roomInk.js (delta-coded integer outlines at 2x, as faceInk.js)
import json, sys
res = json.load(open(sys.argv[1])); out = sys.argv[2]
def enc(s):
    a = [int(round(s['v'] * 1000)), len(s['r'])]
    for q in s['r']:
        a.append(len(q)); px, py = q[0]; a += [px, py]
        for x, y in q[1:]: a += [x - px, y - py]; px, py = x, y
    return '[' + ','.join(map(str, a)) + ']'
hdr = """// s02 room ink as outlines: the room's white line work MEASURED on two sharp views by src/shots/s02/trace/
// trace_room.py (grade inverted; thirteen narrow brightness levels over black, each vectorized at 2x as contours with holes):
// STARE = the shelves round his head (frames 8.24-8.64 s, world coords = frame coords), BOXES = the carton stack at the
// hold (frames 14.48-15.92 s, in hold-frame coords; placed at world (2203.3, -1893.4); the sitting owl inpainted over).
// Shape = [v*1000, nRings, len, x0, y0, dx, dy, ...] in half-pixels, filled even-odd. Shapes and values only.
"""
body = ''
for k, name in (('stare', 'STARE'), ('boxes', 'BOXES')):
    body += f'export const {name}_PAPER = {res[k]["paper"]};\n'
    body += f'export const {name} = [\n' + ',\n'.join('[\n' + ',\n'.join(enc(s) for s in L) + ']' for L in res[k]['levels']) + '\n];\n'
open(out, 'w').write(hdr + body)
print(len(hdr + body) // 1024, 'KB')
