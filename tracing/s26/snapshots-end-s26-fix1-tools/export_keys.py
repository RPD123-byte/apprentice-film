# export_keys.py IN.json OUT.js NAME "comment": key-frame traces -> data module {keys: [K...], data: [frame...]}
import json, sys, os
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from codec import deep
IN, OUT, NAME, CMT = sys.argv[1:5]
d = json.load(open(IN)); K = d['keys']
with open(OUT, 'w') as o:
    o.write('// ' + CMT.replace('\n', '\n// ') + '\n')
    o.write(f'export const {NAME}_KEYS = {json.dumps(K)};\n')
    o.write(f'export const {NAME} = [\n' + ',\n'.join(json.dumps(deep(d['frames'][str(k)]), separators=(',', ':')) for k in K) + '\n];\n')
print(OUT, os.path.getsize(OUT))
