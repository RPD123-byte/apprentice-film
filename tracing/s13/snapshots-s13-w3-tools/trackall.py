# trackall.py OUT : every part's template (C hold median) tracked in source and render, all C-based frames;
# prints render - source placement error (px, deg) where the template holds (ncc > 0.9)
import cv2, numpy as np, sys
out = sys.argv[1]; S = '/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src'
C = np.median(np.stack([cv2.imread(f'{S}/f{f}.png', 0) for f in range(891, 899)]), 0).astype(np.float32)
import os
PARTS = json_parts if False else {'face': (930, 190, 1290, 470), 'cup': (1440, 150, 1570, 420), 'wing': (1700, 300, 2050, 650), 'chest': (1000, 600, 1400, 800),
         'tail': (1600, 700, 1800, 900), 'feet': (1180, 860, 1560, 944), 'crown': (1000, 20, 1400, 150), 'bellyL': (880, 450, 1060, 880), 'bellyB': (1150, 760, 1500, 880), 'chestU': (1050, 480, 1350, 620), 'wroot': (1480, 330, 1700, 700)}
SEL = os.environ.get('PARTS'); 
if SEL: PARTS = {k: v for k, v in PARTS.items() if k in SEL.split(',')}
frames = [int(a) for a in sys.argv[2:]] or [f for f in range(884, 923) if not (901 <= f <= 912)]
def tr(I, box, P=45):
    x0, y0, x1, y1 = box; T = C[y0:y1, x0:x1]; best = None
    for ang in np.arange(-4, 4.01, 0.5):
        M = cv2.getRotationMatrix2D(((x0 + x1) / 2, (y0 + y1) / 2), ang, 1.0)
        Ir = cv2.warpAffine(I, M, (I.shape[1], I.shape[0]))
        W = Ir[max(0, y0 - P):min(946, y1 + P), max(0, x0 - P):x1 + P]
        res = cv2.matchTemplate(W, T, cv2.TM_CCOEFF_NORMED); _, mx, _, loc = cv2.minMaxLoc(res)
        # subpixel refine
        lx, ly = loc
        if 0 < lx < res.shape[1] - 1 and 0 < ly < res.shape[0] - 1:
            dx = 0.5 * (res[ly, lx - 1] - res[ly, lx + 1]) / (res[ly, lx - 1] - 2 * res[ly, lx] + res[ly, lx + 1] + 1e-9)
            dy = 0.5 * (res[ly - 1, lx] - res[ly + 1, lx]) / (res[ly - 1, lx] - 2 * res[ly, lx] + res[ly + 1, lx] + 1e-9)
        else: dx = dy = 0
        if best is None or mx > best[0]: best = (mx, ang, lx + dx - min(P, x0), ly + dy - min(P, y0))
    return best
for f in frames:
    Is = cv2.imread(f'{S}/f{f}.png', 0).astype(np.float32); Ir = cv2.imread(f'{out}/r{f}.png', 0).astype(np.float32)
    row = []
    for k, b in PARTS.items():
        s = tr(Is, b); r = tr(Ir, b)
        if s[0] < 0.85: row.append(f'{k}:--'); continue
        e = (r[1] - s[1], r[2] - s[2], r[3] - s[3])
        flag = '*' if abs(e[1]) > 1.5 or abs(e[2]) > 1.5 or abs(e[0]) > 0.6 else ''
        row.append(f'{k}:{e[1]:+.1f},{e[2]:+.1f},{e[0]:+.1f}{flag}')
    print(f, ' '.join(row), flush=True)
