#!/usr/bin/env python3
# trace_poster.py JSON -> src/shots/s02/faceInk.js (delta-coded integer outlines at 2x)
# shape = [v100, nRings, len, x0, y0, dx, dy, ..., len, x0, y0, ...]  (half-pixel units; even-odd fill)
import json, sys
res = json.load(open(sys.argv[1])); out = sys.argv[2]
def enc(s):
    a = [int(round(s['v'] * 100)), len(s['r'])]
    for q in s['r']:
        a.append(len(q)); px, py = q[0]; a += [px, py]
        for x, y in q[1:]: a += [x - px, y - py]; px, py = x, y
    return '[' + ','.join(map(str, a)) + ']'
blocks = []
for part, name in (('face', 'FACE'), ('eye0', 'EYE0'), ('iris0', 'IRIS0'), ('eye1', 'EYE1')):
    for lev, suf in (('pale', 'P'), ('grey', 'G'), ('ink', 'I')):
        blocks.append((f'{name}_{suf}', res[part][lev]))
hdr = """// s02 designer ink as outlines: the line work of the source's stare frames MEASURED by src/shots/s02/trace/
// (trace_designer.py averages the frames and inverts the grade; trace_poster.py splits the ink into pale, grey and
// ink levels relative to the local paper and vectorizes each at 2x as contours with holes; tojs_poster.py). Frames:
// 8.24-8.64 s for the face, 6.08-6.88 s for the stare eyes (IRIS0 = the irises, moved by the scan), 8.96-10.44 s for
// the look eyes. Shape = [v*100, nRings, len, x0, y0, dx, dy, ...] in half-pixels, filled even-odd in value v.
// Shapes and values only — no source pixels are stored.
"""
body = ''.join(f'export const {n} = [\n' + ',\n'.join(enc(s) for s in L) + '\n];\n' for n, L in blocks)
open(out, 'w').write(hdr + body)
print({n: len(L) for n, L in blocks}, len(hdr + body) // 1024, 'KB')
