#!/usr/bin/env python3
# s16 mug tone (this pass): the mug's enamel light as a coarse grid (4 px columns x 10 px rows over the body),
# measured on the plate (sigma-3 blurred) -> data/mug.js; `mug.py cal RAW.png [gain]` moves it by the blurred
# difference of the source and a raw render of the film's own room (the authored speckles and dashes on top shift
# the mean), kept in snapshots/s16-h1-work/mug_grid.npy. Numbers only.
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import m16, cv2, numpy as np
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'mug.js')
WF = m16.ROOT + '/snapshots/s16-h1-work/mug_grid.npy'
M = m16.M
E = m16.plateE()[M:M + 946, M:M + 2206]
GX = np.arange(730, 878, 4); GY = np.arange(710, 852, 10)
B3 = cv2.GaussianBlur(E, (0, 0), 3)
body = np.zeros(E.shape, np.uint8)
MUG = [[733, 725.5], [748, 719.5], [765, 715], [790, 712], [830, 711], [855, 713.5], [873, 719.5], [866, 846], [800, 847.5], [741, 848]]
cv2.fillPoly(body, [np.round(np.array(MUG) * 4).astype(np.int32)], 1, shift=2)
bodyE = cv2.erode(body, np.ones((5, 5), np.uint8))
def cell_mean(img, x, y):
    x0, x1, y0, y1 = int(x) - 2, int(x) + 2, int(y) - 5, int(y) + 5
    m = bodyE[y0:y1, x0:x1] > 0
    return float(img[y0:y1, x0:x1][m].mean()) if m.sum() >= 6 else None
if len(sys.argv) > 1 and sys.argv[1] == 'cal':
    G = np.load(WF)
    raw = cv2.imread(sys.argv[2], 0).astype(np.float32) / 255
    gain = float(sys.argv[3]) if len(sys.argv) > 3 else 0.8
    R3 = cv2.GaussianBlur(raw, (0, 0), 3); d = []
    for j, y in enumerate(GY):
        for i, x in enumerate(GX):
            a, b = cell_mean(B3, x, y), cell_mean(R3, x, y)
            if a is None or b is None: continue
            G[j, i] = np.clip(G[j, i] + gain * (a - b), 0, 1); d.append(abs(a - b))
    print('mug cal: mean |diff| %.4f over %d cells' % (np.mean(d), len(d)))
else:
    G = np.zeros((len(GY), len(GX)), np.float32)
    for j, y in enumerate(GY):
        for i, x in enumerate(GX):
            v = cell_mean(B3, x, y)
            G[j, i] = v if v is not None else np.nan
    # cells off the body take their row's nearest valid value
    for j in range(len(GY)):
        row = G[j]; ok = ~np.isnan(row)
        if ok.any(): G[j] = np.interp(np.arange(len(row)), np.nonzero(ok)[0], row[ok])
    for i in range(len(GX)):
        col = G[:, i]; ok = ~np.isnan(col)
        if ok.any(): G[:, i] = np.interp(np.arange(len(col)), np.nonzero(ok)[0], col[ok])
np.save(WF, G)
with open(OUT, 'w') as f:
    f.write('// s16 mug tone grid (src/shots/s16/trace/mug.py): value at x = MX0 + 4 i, y = MY0 + 10 j, light-matched.\n')
    f.write('export const MX0 = %d, MY0 = %d, MUGG = %s;\n' % (GX[0], GY[0], str([[round(float(v), 3) for v in r] for r in G]).replace(' ', '')))
print('wrote', OUT)
