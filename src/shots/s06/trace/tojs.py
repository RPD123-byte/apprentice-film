#!/usr/bin/env python3
# tojs.py in.json out.js NAME "header comment" [--flow flow.json]: traced strokes -> a JS data module.
# Each stroke is a flat list x, y, w, v, b per point (frame px, width px, ungraded ink value 0..1 at the centre,
# ungraded local ground value 0..1). Optional per-stroke extras are appended as a trailing object.
import json, sys
res = json.load(open(sys.argv[1])); out = sys.argv[2]; name = sys.argv[3]; hdr = sys.argv[4] if len(sys.argv) > 4 else ''
lines = []
for r in res:
    pts = r['pts'] if isinstance(r, dict) else r
    flat = []
    for p in pts:
        x, y, w, v, b = p[:5]
        flat += [round(x * 2) / 2, round(y * 2) / 2, round(w, 1), round(v, 2), round(b, 2)]
    s = '[' + ','.join(('%g' % f) for f in flat) + ']'
    lines.append(s)
txt = ''.join('// ' + l + '\n' for l in hdr.split('\n') if l) + f'export const {name} = [\n' + ',\n'.join(lines) + '\n];\n'
open(out, 'w').write(txt)
print(len(lines), 'strokes ->', out, len(txt) // 1024, 'KB')
