#!/usr/bin/env python3
# cel2js.py out.js NAME a.json [b.json ...] -- merge cel traces (./cel.py) into one data module (control points only)
import json, sys
out, name = sys.argv[1], sys.argv[2]; d = {}
for p in sys.argv[3:]: d.update(json.load(open(p)))
def ring(r): return '[' + ','.join(('%g' % v) for v in r) + ']'
def rings(R): return '[' + ','.join(ring(r) for r in R) + ']'
L = []
for k, o in d.items():
    s = '  %s: { base: %g, region: %s,%s levels: [' % (k, o['base'], rings(o['region']), (' core: %s,' % rings(o['core'])) if 'core' in o else '')
    s += ','.join('[' + ','.join('{ v: %g, rings: %s }' % (G['v'], rings(G['rings'])) for G in l['groups']) + ']' for l in o['levels']) + ']'
    if 'mesh' in o:
        s += ', mesh: [' + ','.join('{ mu: %g, amp: %g,%s lo: %g, hi: %g, rings: %s }' % (q['mu'], q.get('amp', 0), ' overlay: true,' if q.get('overlay') else '', q['lo'], q['hi'], rings(q['rings'])) for q in o['mesh']['parts']) + ']'
    L.append(s + ' }')
open(out, 'w').write('// s13 cel traces (./trace/cel.py): measured flat-shaded regions as polygon rings (even-odd) with a pre-grade value per\n'
                     '// level, painted in order over a base fill. Control points only, no pixels.\nexport const %s = {\n%s,\n};\n' % (name, ',\n'.join(L)))
print(out, sum(len(x) for x in L) // 1024, 'KB')
