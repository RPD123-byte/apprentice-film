#!/usr/bin/env python3
# trace_owl.py JSON -> src/shots/s02/owlInk.js (delta-coded integer outlines in half-units, as roomInk.js)
import json, sys
res = json.load(open(sys.argv[1])); out = sys.argv[2]
def enc(s):
    a = [int(round(s['v'] * 1000)), len(s['r'])]
    for q in s['r']:
        a.append(len(q)); px, py = q[0]; a += [px, py]
        for x, y in q[1:]: a += [x - px, y - py]; px, py = x, y
    return '[' + ','.join(map(str, a)) + ']'
hdr = """// s02 owl as outlines, MEASURED by src/shots/s02/trace/trace_owl.py (+ tojs_owl.py): seven brightness levels inside the
// owl's silhouette, vectorized at 2x. SIT = the sitting owl, eyes open (14.48-15.12 s, hold-frame half-pixels; placed
// at world (2203.3, -1893.4) like BOXES); SIT_HALF / SIT_SHUT = its eye region with heavy lids / shut; FLY = the flying
// owl without its wings, eyes shut, in half owl-units round the root (the median of the aligned frames 17.84-19.12 s).
// Shape = [v*1000, nRings, len, x0, y0, dx, dy, ...], filled even-odd, levels drawn in order. Shapes and values only.
"""
body = ''
for k, name in (('sit', 'SIT'), ('sit_half', 'SIT_HALF'), ('sit_shut', 'SIT_SHUT'), ('fly', 'FLY')):
    body += f'export const {name} = [\n' + ',\n'.join('[' + ',\n'.join(enc(s) for s in L) + ']' for L in res[k]) + '\n];\n'
open(out, 'w').write(hdr + body)
print(len(hdr + body) // 1024, 'KB')
