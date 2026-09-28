# Remove the thin horizontal spur (a traced sliver of the cabinet-top line behind his hair, ~70 x 8 px at frame
# (1014..1115, 526..546)) from three designer key outlines. Vertex ranges were found by decoding the outlines.
import re, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/tools/trace-scripts/s27t-tools')
from codec import enc, dec
D = '/Users/computer/rootline/apprentice-film/src/shots/s27/dkeys/'
FIX = {'d_128_2.js': ('D128_2_OUTLINE', 157, 161), 'd_128_44.js': ('D128_44_OUTLINE', 170, 174), 'd_128_68.js': ('D128_68_OUTLINE', 204, 208)}
for f, (name, a, b) in FIX.items():
    s = open(D + f).read()
    m = re.search(r'export const %s = "((?:[^"\\]|\\.)*)";' % name, s)
    raw = m.group(1).encode().decode('unicode_escape')
    p = dec(raw)
    pts = [(p[i], p[i + 1]) for i in range(0, len(p), 2)]
    cut = pts[a:b + 1]
    assert all(1000 * 2 < x < 1120 * 2 and 520 * 2 < y < 548 * 2 for x, y in cut), cut
    pts = pts[:a] + pts[b + 1:]
    new = enc([v for q in pts for v in q])
    esc = new.replace('\\', '\\\\').replace('"', '\\"')
    s = s[:m.start(1)] + esc + s[m.end(1):]
    open(D + f, 'w').write(s)
    print(f, 'removed', [(x // 2, y // 2) for x, y in cut])
