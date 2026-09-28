# end-s28-fix1: the room keys room13032 / room13052 also traced the tip of the hair strand that curls onto the wall
# (it lies outside the figure's silhouette); re-projected with the wall's depth it floated loose from the strand (which the
# figure keys now carry, fixstrand.py). Those ink shapes are removed. Idempotent.
import json, os, shutil, numpy as np
K = '/Users/computer/rootline/apprentice-film/src/shots/s28/keys'
for name, (bx0, by0, bx1, by1) in (('room13032', (989, 262, 1003, 272)), ('room13052', (1022, 264, 1038, 275))):
    p = f'{K}/{name}.js'; bk = f'/Users/computer/rootline/apprentice-film/snapshots/end-s28-fix1-tools/keys-orig/{name}.js'
    if not os.path.exists(bk): shutil.copy(p, bk)
    s = open(p).read(); i = s.index('export default '); head, body = s[:i], s[i + 15:].rstrip().rstrip(';')
    D = json.loads(body); n0 = len(D['ink'])
    def inside(sh):
        r = np.array(sh['r'][0]); x0, y0 = r.min(0); x1, y1 = r.max(0)
        return sh['l'] in (0, 1) and x0 >= bx0 and y0 >= by0 and x1 <= bx1 and y1 <= by1
    D['ink'] = [sh for sh in D['ink'] if not inside(sh)]
    if 'strand tip' not in head:
        head = head.rstrip('\n') + "\n// - the hair strand tip on the wall removed (the figure keys carry the strand) by snapshots/end-s28-fix1-tools/fixfleck.py.\n"
    open(p, 'w').write(head + 'export default ' + json.dumps(D, separators=(',', ':')) + ';\n')
    print(name, 'removed', n0 - len(D['ink']))
