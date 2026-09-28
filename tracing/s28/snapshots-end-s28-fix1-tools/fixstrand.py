# end-s28-fix1: at 130.40-130.60 a hair strand curls up from his hair onto the wall (source ~(1000-1060, 250-290)); the
# figure key fig13052 traced only its tip (inside the silhouette), which floated as a loose fleck. The strand's ink is
# re-traced from the key's own source frame in that box and appended (tagged x: "strand"; idempotent).
import sys, json, os, shutil
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s28-fix1-tools')
from fixbeanie import ink_box, LEV
K = '/Users/computer/rootline/apprentice-film/src/shots/s28/keys'
for name, box in (('fig13052', (990, 240, 1062, 292)), ('fig13032', (975, 235, 1062, 292))):
    p = f'{K}/{name}.js'; bk = f'/Users/computer/rootline/apprentice-film/snapshots/end-s28-fix1-tools/keys-orig/{name}.js'
    if not os.path.exists(bk): shutil.copy(p, bk)
    s = open(p).read(); i = s.index('export default '); head, body = s[:i], s[i + 15:].rstrip().rstrip(';')
    D = json.loads(body)
    D['ink'] = [sh for sh in D['ink'] if sh.get('x') != 'strand']
    new = [dict(sh, x='strand') for sh in ink_box(D['t'], box, LEV)]
    D['ink'] += new
    if 'hair strand' not in head:
        head = head.rstrip('\n') + "\n// + the hair strand curling onto the wall at (1000-1060, 250-290) re-traced by snapshots/end-s28-fix1-tools/fixstrand.py.\n"
    open(p, 'w').write(head + 'export default ' + json.dumps(D, separators=(',', ':')) + ';\n')
    print(name, D['t'], 'added', len(new), [ (sh['l'], len(sh['r'][0])) for sh in new])
