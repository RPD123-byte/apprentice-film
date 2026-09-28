# Draw each designer key's outline over its own source frame (numbered vertices every 5) to find background chunks.
import re, sys, cv2, numpy as np, glob, os
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/tools/trace-scripts/s27t-tools')
from codec import dec
REF = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/ref'
D = '/Users/computer/rootline/apprentice-film/src/shots/s27/dkeys/'
names = sys.argv[1].split(','); crop = [int(v) for v in sys.argv[2].split(',')]; out = sys.argv[3]
tiles = []
for n in names:
    s = open(D + 'd_%s.js' % n.replace('.', '_')).read()
    m = re.search(r'export const (\w+_OUTLINE) = "((?:[^"\\]|\\.)*)";', s)
    pts = np.array(dec(m.group(2).encode().decode('unicode_escape'))).reshape(-1, 2) / 2.0
    k = round(float(n) * 25); im = cv2.imread(f'{REF}/src/{k:05d}.png')
    cv2.polylines(im, [np.int32(pts)], True, (0, 0, 255), 1)
    for j in range(0, len(pts), 5): cv2.putText(im, str(j), (int(pts[j][0]) + 2, int(pts[j][1]) - 2), 0, 0.4, (255, 0, 0), 1)
    x0, y0, x1, y1 = crop; c = cv2.resize(im[y0:y1, x0:x1], None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    cv2.putText(c, n, (10, 30), 0, 1, (0, 200, 0), 2); tiles.append(c)
cv2.imwrite(out, np.hstack(tiles))
