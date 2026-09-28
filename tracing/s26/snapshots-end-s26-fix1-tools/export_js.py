# export_js.py IN.json OUT.js NAME "comment": write a traced-frames data module (strings via codec.deep)
import json, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from codec import deep
IN, OUT, NAME, CMT = sys.argv[1:5]
d = json.load(open(IN))
fr = d['frames']; Fs = sorted(int(k) for k in fr)
rows = []
for F in range(Fs[0], Fs[-1] + 1):
    v = fr.get(str(F))
    rows.append(json.dumps(deep(v), separators=(',', ':')) if v is not None else 'null')
with open(OUT, 'w') as o:
    o.write('// ' + CMT.replace('\n', '\n// ') + '\n')
    o.write(f'export const {NAME}_F0 = {Fs[0]};\n')
    o.write(f'export const {NAME} = [\n' + ',\n'.join(rows) + '\n];\n')
import os; print(OUT, os.path.getsize(OUT))
