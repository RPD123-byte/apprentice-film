#!/usr/bin/env python3
# masses2js.py in.json out.js NAME "header": tonal masses -> JS {layer: [[v, [x,y,x,y..], [ring2..]], ...]}
import json, sys
res = json.load(open(sys.argv[1])); out = sys.argv[2]; name = sys.argv[3]; hdr = sys.argv[4] if len(sys.argv) > 4 else ''
parts = []
for k, items in res.items():
    rows = []
    for it in items:
        rings = ['[' + ','.join('%d,%d' % (p[0], p[1]) for p in r) + ']' for r in it['rings']]
        rows.append('[%g,%s]' % (round(it['v'], 3), ','.join(rings)))
    parts.append('  %s: [\n    %s,\n  ]' % (k, ',\n    '.join(rows)))
txt = ''.join('// ' + l + '\n' for l in hdr.split('\n') if l) + 'export const %s = {\n%s,\n};\n' % (name, ',\n'.join(parts))
open(out, 'w').write(txt); print(out, len(txt) // 1024, 'KB')
