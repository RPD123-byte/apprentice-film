# List / remove ink polygons of a traced room file whose points all lie inside a zone polygon (frame px of that trace).
# inkzone.py FILE.js ZONE_JSON [--remove] [--minlen L]   (pure JSON edit: no rasterising, other polygons untouched)
import re, sys, json, numpy as np, cv2
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/tools/trace-scripts/s27t-tools')
from codec import dec
path, zone = sys.argv[1], np.array(json.loads(sys.argv[2]), np.float32)
rm = '--remove' in sys.argv
minlen = float(sys.argv[sys.argv.index('--minlen') + 1]) if '--minlen' in sys.argv else 0
s = open(path).read()
name = re.findall(r'export const (\w+_INK) = ', s)[0]
m = re.search(r'export const %s = (.*?);\n' % name, s, re.S)
INK = json.loads(m.group(1))
inside = lambda p: all(cv2.pointPolygonTest(zone, (float(x), float(y)), False) >= 0 for x, y in p)
out, n = [], 0
for grp in INK:
    keep = [grp[0]]
    for poly in grp[1:]:
        p = np.array(dec(poly[0]) if isinstance(poly[0], str) else poly[0], float).reshape(-1, 2) / 2
        L = np.hypot(*(p.max(0) - p.min(0)))
        if inside(p) and L >= minlen:
            n += 1; print(grp[0], 'bbox', p.min(0).round(), p.max(0).round(), 'len %.0f' % L)
            if rm: continue
        keep.append(poly)
    if len(keep) > 1: out.append(keep)
print(name, 'matched', n)
if rm:
    s = s[:m.start(1)] + json.dumps(out, separators=(',', ':')) + s[m.end(1):]
    open(path, 'w').write(s); print('removed')
