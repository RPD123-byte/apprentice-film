# celcal.py OUT key f0 f1 : per posterised level of a cel trace, mean render vs source inside its groups (eroded 1px)
import json, numpy as np, cv2, sys
out, key, f0, f1 = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
C = json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s13-w3-tools/data/celC.json'))[key]
def mask(rings):
    m = np.zeros((946, 2206), np.uint8)
    for r in rings:
        t = np.zeros_like(m); p = np.array(r, np.float32).reshape(-1, 2); cv2.fillPoly(t, [np.round(p * 16).astype(np.int32)], 1, shift=4); m ^= t
    return m
lab = np.full((946, 2206), -1, np.int32); reg = mask(C['region']); lab[reg > 0] = 0
vals = [C['base']]
gid = 1; ginfo = [(-1, C['base'])]
for li, L in enumerate(C['levels']):
    for G in L:
        m = mask(G['rings']); lab[m > 0] = gid; ginfo.append((li, G['v'])); gid += 1
er = cv2.erode((lab >= 0).astype(np.uint8), np.ones((3, 3), np.uint8))
R = np.mean([cv2.imread(f"{out}/r{f}.png", 0).astype(np.float32) for f in range(f0, f1 + 1)], 0)
BL = float(sys.argv[5]) if len(sys.argv) > 5 else 0
S = np.mean([cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src/f{f}.png', 0).astype(np.float32) for f in range(f0, f1 + 1)], 0)
if BL: R, S = cv2.GaussianBlur(R, (0, 0), BL), cv2.GaussianBlur(S, (0, 0), BL)
print('level  n_px   v(pre)  render  source  diff')
for li in range(-1, len(C['levels'])):
    sel = np.zeros_like(er, bool)
    for g, (l, v) in enumerate(ginfo):
        if l == li: sel |= (lab == g)
    sel &= er > 0
    if sel.sum() < 20: continue
    vs = [v for (l, v) in ginfo if l == li]
    print(f'{li:4d} {sel.sum():7d}  {np.mean(vs):.3f}  {R[sel].mean():6.1f}  {S[sel].mean():6.1f}  {R[sel].mean()-S[sel].mean():+6.2f}')
tot = er > 0; print('all', tot.sum(), f'{R[tot].mean():.1f} {S[tot].mean():.1f} {R[tot].mean()-S[tot].mean():+.2f}  MAE px {np.abs(R-S)[tot].mean():.2f}')
