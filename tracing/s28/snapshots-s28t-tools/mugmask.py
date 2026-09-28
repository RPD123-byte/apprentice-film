# s28t: the mug's outline in a SOURCE frame (measurement): GrabCut inside a rectangle round it, snapped to its ink.
# Usage: mugmask.py -> mug_masks.json {t: ring} + a check sheet
import sys, json, numpy as np, cv2
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28t-tools')
from m import frame, SRC
RECT = {129.32: (1760, 575, 1945, 755), 129.52: (1840, 580, 2035, 765), 129.72: (1935, 585, 2140, 775), 129.92: (2045, 595, 2206, 790)}
out = {}; ims = []
for t, (x0, y0, x1, y1) in RECT.items():
    f = frame(SRC, round(t * 25))
    m = np.zeros(f.shape[:2], np.uint8)
    bgd = np.zeros((1, 65)); fgd = np.zeros((1, 65))
    cv2.grabCut(f, m, (x0, y0, x1 - x0, y1 - y0), bgd, fgd, 8, cv2.GC_INIT_WITH_RECT)
    g = np.isin(m, [1, 3]).astype(np.uint8) * 255
    g = cv2.morphologyEx(g, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(g)
    g = (lab == 1 + np.argmax(st[1:, 4])).astype(np.uint8) * 255
    cs, _ = cv2.findContours(g, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    fill = np.zeros_like(g); cv2.drawContours(fill, cs, -1, 255, -1)
    fill = cv2.dilate(fill, np.ones((5, 5), np.uint8))          # keep the outline
    cs, _ = cv2.findContours(fill, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)
    out[f"{t:.2f}"] = cv2.approxPolyDP(c.astype(np.float32), 1.0, True).reshape(-1, 2).tolist()
    v = f.copy(); cv2.drawContours(v, [c], -1, (0, 255, 0), 1)
    ims.append(cv2.resize(v[y0 - 20:y1 + 20, x0 - 20:min(2206, x1 + 20)], (260, 240)))
json.dump(out, open('/Users/computer/rootline/apprentice-film/snapshots/s28t-tools/mug_masks.json', 'w'))
cv2.imwrite('/Users/computer/rootline/apprentice-film/snapshots/s28t-work/mugmasks.jpg', np.hstack(ims))
