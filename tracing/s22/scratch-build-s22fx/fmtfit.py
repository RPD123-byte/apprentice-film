import json, sys
sys.path.insert(0, '.')
from importlib import util
spec = util.spec_from_file_location('tojs', 'tojs.py')
# reuse js() without running main: exec only function defs
src = open('tojs.py').read().split('F = fix(')[0]
ns = {}; exec(src, ns)
F = ns['fix'](json.load(open(sys.argv[1])))
name = sys.argv[2]
comments = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else {}
out = [f'export const {name} = {{']
for k, v in F.items():
    c = ('  // ' + comments[k] + '\n') if k in comments else ''
    if k in ('face', 'top', 'back') and isinstance(v, list):
        out.append(c + f'  {k}: [')
        for e in v: out.append('    ' + ns['js'](e) + ',')
        out.append('  ],')
    else:
        out.append(c + f'  {k}: {ns["js"](v)},')
out.append('};')
print('\n'.join(out))
