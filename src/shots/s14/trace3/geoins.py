# insert geo3.js entries after a given key: geoins.py AFTER_KEY < lines (each line: "name": [layer, shape, opts],)
import sys, re
p = '/Users/computer/rootline/apprentice-film/src/shots/s14/geo3.js'
key = sys.argv[1]
new = sys.stdin.read().strip('\n')
lines = open(p).read().split('\n')
for i, l in enumerate(lines):
    if l.startswith(f'"{key}":'):
        if not lines[i].rstrip().endswith(','): lines[i] = lines[i].rstrip() + ','
        new = new.rstrip().rstrip(',') + ','
        lines[i + 1:i + 1] = new.split('\n')
        break
else:
    sys.exit('no key ' + key)
s = '\n'.join(lines)
s = re.sub(r',(\s*\n\};)', r'\1', s)
open(p, 'w').write(s)
print('ok')
