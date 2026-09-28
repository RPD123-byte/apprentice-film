#!/usr/bin/env python3
# dq.py rotoX.js frame [ids...]: print the quads of a roto frame
import sys, re, json
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s15-fix2/h')
from common import jsdata
d = jsdata('/Users/computer/rootline/apprentice-film/src/shots/s15/' + sys.argv[1])
f = sys.argv[2]; ids = sys.argv[3:]
rows = d['frames'].get(f)
if rows is None:
    print('no frame', f, sorted(d['frames'].keys())); sys.exit()
for r in rows:
    if ids and r[0] not in ids: continue
    print(r[0].ljust(8), d['faces'].get(r[0], {}).get('tex', 'plain').ljust(8), ' '.join(f'{v:.0f}' for v in r[1:9]), '|', ' '.join(f'{v:.2f}' for v in r[9:13]))
