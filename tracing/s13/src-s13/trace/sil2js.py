#!/usr/bin/env python3
# sil2js.py sil.json out.js NAME — measured silhouette rings -> JS (flat x,y lists; fill even-odd)
import json, sys
S = json.load(open(sys.argv[1])); out = sys.argv[2]; name = sys.argv[3]
hdr = """// s13 part silhouettes MEASURED on the source (./trace/outlines.py): the lit outline split between the rig's parts,
// as simplified rings (frame px, flat x,y lists; outer contour + real black gaps, fill even-odd). Control points only.
"""
parts = []
for k, rings in S.items():
    parts.append('  %s: [\n%s\n  ]' % (k, ',\n'.join('    [' + ','.join('%d,%d' % (p[0], p[1]) for p in r) + ']' for r in rings)))
open(out, 'w').write(hdr + 'export const %s = {\n%s\n};\n' % (name, ',\n'.join(parts)))
