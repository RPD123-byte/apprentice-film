#!/usr/bin/env python3
# patchrows.py MODULE.js OUT.js NAME IN.json [comment-append]: replace the rows of a traced-frames data module
# (one row per frame after "export const NAME = [") by the frames in IN.json {'frames': {F: frame}} (codec strings)
import sys, json
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from codec import deep
mod, out, name, inj = sys.argv[1:5]; note = sys.argv[5] if len(sys.argv) > 5 else None
L = open(mod).read().split('\n')
f0 = next(int(l.split('=')[1].strip(' ;')) for l in L if l.startswith(f'export const {name}_F0'))
i0 = next(i for i, l in enumerate(L) if l.startswith(f'export const {name} = [')) + 1
rows = []
i = i0
while not L[i].startswith('];'): rows.append(L[i].rstrip(',')); i += 1
fr = json.load(open(inj))['frames']
for k, v in fr.items():
    F = int(k); j = F - f0
    row = json.dumps(deep(v), separators=(',', ':'))
    if j == len(rows): rows.append(row)
    elif 0 <= j < len(rows): rows[j] = row
    else: raise SystemExit(f'frame {F} outside {f0}..{f0 + len(rows)}')
head = L[:i0 - 1]
if note: head.insert(next(k for k, l in enumerate(head) if l.startswith('export const')), '// ' + note)
open(out, 'w').write('\n'.join(head + [f'export const {name} = ['] + [',\n'.join(rows)] + L[i:]))
print(out, 'rows', len(rows))
