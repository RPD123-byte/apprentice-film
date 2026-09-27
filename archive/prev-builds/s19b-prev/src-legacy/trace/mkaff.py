# Write the OWLAFF table into s19.js from keyplan JSONs (+ the lift rows from owltrack's ot-lift.json, t <= 61.80).
import sys, json, re
rows = {}
for p in sys.argv[1].split(','):
    for r in json.load(open(p)):
        t = round(r[0], 2)
        if t not in rows or r[-1] > rows[t][-1]: rows[t] = r
for r in json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-ref/ot-lift.json')):
    t = round(r[0], 2)
    if 61.42 < t <= 61.81: rows[t] = [t, '61.36'] + r[1:] + [None]
lines = []
for t in sorted(rows):
    r = rows[t]; A = r[2:8]
    lines.append(f'  [{t:.2f}, "{r[1]}", ' + ', '.join(f'{v:.4f}' if i in (0, 1, 3, 4) else f'{v:.1f}' for i, v in enumerate(A)) + '],' + (f'   // IoU {r[8]}' if r[8] is not None else '   // lift, ECC'))
p = '/Users/computer/rootline/apprentice-film/src/shots/s19.js'
s = open(p).read()
i0 = s.index('const OWLAFF = [') + len('const OWLAFF = [\n'); i1 = s.index('];', i0)
s = s[:i0] + '\n'.join(lines) + '\n' + s[i1:]
open(p, 'w').write(s)
print(len(lines), 'rows')
