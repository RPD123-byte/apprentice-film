#!/usr/bin/env python3
# trace JSON (trace_designer.py) -> src/shots/s02/faceInk.js
# Each stroke: [v, x0, y0, w0, x1, y1, w1, ...]  v = ink value 0..1 (pre-grade paint), x/y frame px, w draw width px.
import json, sys
res = json.load(open(sys.argv[1])); out = sys.argv[2]
IRIS0 = [(852.5, 323.5), (1232.5, 318.5)]           # stare iris centres (Hough on the stare average), r 28
def enc(s):
    flat = [round(s['v'], 2)]
    for x, y, w in s['p']: flat += [round(x * 2) / 2, round(y * 2) / 2, round(w, 1)]
    return '[' + ','.join('%g' % f for f in flat) + ']'
def in_iris(s):
    for cx, cy in IRIS0:
        if all((x - cx) ** 2 + (y - cy) ** 2 < 31 ** 2 for x, y, w in s['p']): return True
    return False
e0 = [s for s in res['eye0'] if not in_iris(s)]; iris = [s for s in res['eye0'] if in_iris(s)]
blocks = [('DARK', res['dark']), ('LIGHT', res['light']), ('EYE0', e0), ('IRIS0', iris), ('EYE1', res['eye1'])]
hdr = """// s02 designer ink: centre-lines of the source's ink strokes MEASURED on averaged stare frames (8.24-8.64 s for the
// face, 6.08-6.88 s for the stare eyes, 8.96-10.44 s for the look eyes) after inverting the global grade, by
// src/shots/s02/trace/trace_designer.py (Hessian ridges, hysteresis, skeleton, re-joined, RDP) + tojs.py.
// Stroke = [v, x0, y0, w0, x1, y1, w1, ...]: v ink value 0..1 (pre-grade), frame px, draw width px (ink mass /
// contrast). Control points only — no source pixels. IRIS0 = the stare irises' strokes (drawn at the scan offset).\n// M* = dark masses: [v, ring, ring...] with rings as flat x,y lists (outer + holes, even-odd).
"""
def encm(m):
    return '[' + '%g' % round(m['v'], 2) + ',' + ','.join('[' + ','.join('%d,%d' % (x, y) for x, y in q) + ']' for q in m['r']) + ']'
mblocks = [('MGREY', res['mgrey']), ('MINK', res['mink']), ('EYE0M', res['e0m']), ('EYE1M', res['e1m'])]
body = ''.join(f'export const {n} = [\n' + ',\n'.join(encm(m) for m in L) + '\n];\n' for n, L in mblocks)
body += ''.join(f'export const {n} = [\n' + ',\n'.join(enc(s) for s in L) + '\n];\n' for n, L in blocks)
open(out, 'w').write(hdr + body)
print({n: len(L) for n, L in mblocks}, {n: len(L) for n, L in blocks}, len(hdr + body) // 1024, 'KB')
