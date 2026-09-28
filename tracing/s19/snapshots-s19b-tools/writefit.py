# writefit.py log1 log2 ... : merge fitted corrections (last JSON line of each shapefit log) into draw/posefit.js
import json, re, sys
p = '../../src/shots/s19/draw/posefit.js'; s = open(p).read()
cur = {}
for m in re.finditer(r'^  (\w+): (\{.*\}),   // (.*)$', s, re.M): cur[m.group(1)] = (m.group(2), m.group(3))
for f in sys.argv[1:]:
    L = open(f).read().strip().splitlines(); d = json.loads(L[-1]); notes = {}
    for l in L[:-1]:
        mm = re.match(r'([\d.]+) (\w+) IoU ([\d.]+) -> ([\d.]+)', l)
        if mm: notes[mm.group(2)] = f'{mm.group(1)}, IoU {mm.group(3)} -> {mm.group(4)}'
    for k, v in d.items():
        js = json.dumps(v, separators=(', ', ': '))
        for w in ['d', 'over', 'body', 'head', 'k']: js = js.replace(f'"{w}"', w)
        cur[k] = (js, notes.get(k, ''))
head = s[:s.index('export const FIT = {') + len('export const FIT = {')]
body = '\n'.join(f'  {k}: {v},   // {n}' for k, (v, n) in cur.items())
open(p, 'w').write(head + '\n' + body + '\n};\n')
print(len(cur), 'entries')
