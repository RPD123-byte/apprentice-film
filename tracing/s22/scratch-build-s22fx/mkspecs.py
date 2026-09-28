import json, sys
src = open('tojs.py').read().split('F = fix(')[0]; ns = {}; exec(src, ns)
# mkspecs.py out.js name=file.json ...
out = ['// s22: the specs of the owl\'s drawings after the cut (s22/late.js). Generated from the fitting runs (silhouette IoU',
       '// against the source\'s owl + measured landmarks and strokes); local px of each drawing. `xf` re-uses a drawing,',
       '// rigidly moved, for a neighbouring pose.', 'export const LATE_SPECS = {']
for a in sys.argv[2:]:
    k, f = a.split('=')
    S = ns['fix'](json.load(open(f)))
    lines = []
    for kk, v in S.items():
        if kk in ('face', 'top', 'mid') and isinstance(v, list):
            lines.append(f'    {kk}: [\n' + '\n'.join('      ' + ns['js'](e) + ',' for e in v) + '\n    ],')
        else: lines.append(f'    {kk}: {ns["js"](v)},')
    out.append(f'  {k}: {{\n' + '\n'.join(lines) + '\n  },')
out.append('};')
open(sys.argv[1], 'w').write('\n'.join(out) + '\n')
