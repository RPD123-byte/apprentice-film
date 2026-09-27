#!/usr/bin/env python3
# trace_pan.py JSON -> src/shots/s02/panInk.js (delta-coded integer outlines, as roomInk.js; units = half mosaic px,
# the mosaic being half resolution: 1 unit = 1 world px)
import json, sys
res = json.load(open(sys.argv[1])); out = sys.argv[2]
import math
if not isinstance(res['paper'], (int, float)) or math.isnan(res['paper']): res['paper'] = 0
def enc(s):
    a = [int(round(s[VK] * 1000)), len(s['r'])]
    for q in s['r']:
        q = [[2 * x, 2 * y] for x, y in q]
        a.append(len(q)); px, py = q[0]; a += [px, py]
        for x, y in q[1:]: a += [x - px, y - py]; px, py = x, y
    return '[' + ','.join(map(str, a)) + ']'
NAME = sys.argv[3] if len(sys.argv) > 3 else 'PAN'
hdr = """// s02 world mosaic of the pans, MEASURED by src/shots/s02/trace/trace_pan.py (+ tojs_pan.py): every pan frame back in
// world coordinates (camera offsets from cam.js), averaged (least-blurred frames weighted up, the flying owl masked),
// at half resolution, split into seven brightness levels and vectorized. The room between the two sharp views and the
// beanie's crown, as the pans show them (soft). Canvas PAN_W x PAN_H at 0.5 px per world px, origin world (PAN_X0, PAN_Y0).
// Shape = [v*1000, nRings, len, x0, y0, dx, dy, ...] in half canvas px, filled even-odd. Shapes and values only.
"""
body = f"export const {NAME}_X0 = {res['x0']}, {NAME}_Y0 = {res['y0']}, {NAME}_W = {res['w']}, {NAME}_H = {res['h']}, {NAME}_PAPER = {res['paper']};\n"
# the same shapes twice: values measured in the outbound pan's frames (PAN_OUT) and in the return's (PAN_BACK)
for VK, name in ((('vo', 'PAN_OUT'), ('vb', 'PAN_BACK')) if NAME == 'PAN' else (('v', NAME),)):
    body += f'export const {name} = [\n' + ',\n'.join('[' + ',\n'.join(enc(s) for s in L) + ']' for L in res['levels']) + '\n];\n'
open(out, 'w').write(hdr + body)
print(len(hdr + body) // 1024, 'KB')
