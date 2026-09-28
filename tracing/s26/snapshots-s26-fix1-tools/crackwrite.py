#!/usr/bin/env python3
# Filter the connected crack polylines (drop short isolated pieces = page hatching the 90 s page did not mask) and
# write src/shots/s26/cracksA2.js. Coordinates only.
import json, numpy as np, sys
P = [np.array(p, float) for p in json.load(open('snapshots/s26-fix1-meas/cracks_poly2.json'))]
def plen(p): return float(np.sum(np.hypot(*np.diff(p, axis=0).T)))
def segdist(q, p):
    a = p[:-1]; b = p[1:]; d = b - a; t = np.clip(((q - a) * d).sum(1) / np.maximum(1e-9, (d * d).sum(1)), 0, 1)
    return float(np.min(np.hypot(*(q - (a + t[:, None] * d)).T)))
keep = []
for i, p in enumerate(P):
    L = plen(p)
    if L >= 60: keep.append(p); continue
    ta = any(segdist(p[0], P[j]) < 3 for j in range(len(P)) if j != i)
    tb = any(segdist(p[-1], P[j]) < 3 for j in range(len(P)) if j != i)
    # short pieces must connect at both ends, or at one end if >= 30 px and not near-vertical (page hatching is vertical)
    d = p[-1] - p[0]; vert = abs(d[0]) < 0.25 * abs(d[1])
    if (ta and tb) or (L >= 30 and (ta or tb) and not vert): keep.append(p)
print('kept', len(keep), 'of', len(P), 'total %.0f' % sum(plen(p) for p in keep), file=sys.stderr)
with open('src/shots/s26/cracksA2.js', 'w') as f:
    f.write('// s26 beat A (110.52–111.56): the crack web as connected polylines, in STAGE px (= frame px in A; the A camera is\n')
    f.write('// within 0.3 % of identity). Measured on the source (coordinates only): the ridge of the median A frame minus the ridge\n')
    f.write('// of the uncracked page at 90.0 s, owl / scissors / stars masked, skeletonised and traced node to node, simplified\n')
    f.write('// (Douglas-Peucker 1.8 px), gaps bridged where two ends line up (<= 18 px) or an end runs onto another line (<= 16 px),\n')
    f.write('// short isolated pieces dropped (snapshots/s26-fix1-tools/crackx.py, crackwrite.py). Each entry: [x0, y0, x1, y1, ...].\n')
    f.write('export const CRACK_WEB = [\n')
    for p in keep: f.write('[' + ','.join('%g' % round(v, 1) for v in p.flatten()) + '],\n')
    f.write('];\n')
