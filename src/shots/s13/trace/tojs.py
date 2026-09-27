#!/usr/bin/env python3
# tojs.py strokes.json geo.json out.js NAME layer1,layer2,... — assign each traced stroke to the first layer (in the
# given priority order) whose silhouette holds its midpoint, and write the flat x,y,w,v lists as a JS module.
import json, sys, cv2, numpy as np
S = json.load(open(sys.argv[1])); G = json.load(open(sys.argv[2])); out = sys.argv[3]; name = sys.argv[4]; order = sys.argv[5].split(',')
# G: a geo dump ({part: [ring]}) or a measured silhouette file ({part: [rings]}); membership is even-odd over rings
polys = {k: [np.array(r, np.float32).reshape(-1, 1, 2) for r in G[k]] for k in order if k in G}
inside = lambda k, p: sum(cv2.pointPolygonTest(r, p, False) >= 0 for r in polys[k]) % 2 == 1
sets = {k: [] for k in order}; sets['rest'] = []
for r in S:
    L = np.sum([np.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]) for i in range(1, len(r))])
    acc, mid = 0, r[0]
    for i in range(1, len(r)):
        acc += np.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1])
        if acc >= L / 2: mid = r[i]; break
    for k in order:
        if k in polys and inside(k, (float(mid[0]), float(mid[1]))): sets[k].append(r); break
    else: sets['rest'].append(r)
def fmt(r):
    flat = []
    for x, y, w, v in r: flat += [round(x * 2) / 2, round(y * 2) / 2, round(w, 1), round(v, 2)]
    return '[' + ','.join('%g' % f for f in flat) + ']'
hdr = """// s13 ink strokes MEASURED on the source (see ./trace/README.md): centre-lines of the dark strokes, each a flat list
// x, y, w, v per point (frame px, stroke width px, ink value 0..1). Control points only — no source pixels are stored;
// s13.js redraws every stroke with the taper engine. Grouped by the layer that carries them.
"""
body = ',\n'.join('  %s: [\n%s\n  ]' % (k, ',\n'.join('    ' + fmt(r) for r in v)) for k, v in sets.items())
open(out, 'w').write(hdr + 'export const %s = {\n%s\n};\n' % (name, body))
print({k: len(v) for k, v in sets.items()})
