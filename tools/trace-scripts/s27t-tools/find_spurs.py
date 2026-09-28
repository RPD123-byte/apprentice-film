# Find thin spurs (parts narrower than ~8 px) in the designer key outlines: rasterise, open, report the removed parts.
import re, sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/tools/trace-scripts/s27t-tools')
from codec import dec
D = '/Users/computer/rootline/apprentice-film/src/shots/s27/dkeys/'
import glob, os
for f in sorted(glob.glob(D + 'd_*.js')):
    s = open(f).read()
    m = re.search(r'export const (\w+_OUTLINE) = "((?:[^"\\]|\\.)*)";', s)
    raw = m.group(2).encode().decode('unicode_escape'); p = dec(raw)
    pts = np.array(p).reshape(-1, 2) / 2.0
    mask = np.zeros((1000, 1600), np.uint8); cv2.fillPoly(mask, [np.int32(np.round(pts + [20, 20]))], 1)
    op = cv2.morphologyEx(mask, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    diff = (mask - op).astype(np.uint8)
    n, cc, st, cen = cv2.connectedComponentsWithStats(diff)
    out = []
    for i in range(1, n):
        x, y, w, h, a = st[i]
        if a > 60 and max(w, h) > 25:
            # vertices inside this component's bbox (dilated)
            idx = [j for j, (px, py) in enumerate(pts) if x - 3 <= px + 20 <= x + w + 3 and y - 3 <= py + 20 <= y + h + 3]
            out.append(((x - 20, y - 20, w, h, a), idx))
    print(os.path.basename(f), len(pts), out)
