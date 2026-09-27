import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import numpy as np, cv2, json, frames
from settle_fit import simM, dis_flow, H, W
from settle_eval import grid_field, forward, order, lay, EV
S = frames.static_target().mean(2).astype(np.float32)
F = json.load(open(f'{frames.CACHE}/settle_fields.json'))
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
k2 = lambda x: cv2.GaussianBlur(x, (0, 0), 2)
for gi in (0, 2, 4):
    k = F['ks'][gi]; Fk = frames.pre(k).mean(2)
    out = np.zeros((H, W), np.float32)
    for L in order:
        dx, dy = grid_field(L, gi)
        a = forward(lay[L].astype(np.float32), dx, dy); v = forward(S * lay[L], dx, dy); out = out * (1 - a) + v
    # dense: warp the grid composite further by DIS flow to the frame (upper bound on what a finer field could do)
    fl = dis_flow(out, Fk)
    dense = cv2.remap(out, xx + fl[..., 0], yy + fl[..., 1], cv2.INTER_LINEAR)   # approx
    e1 = np.abs(k2(out) - k2(Fk))[EV].mean() * 255; e2 = np.abs(k2(dense) - k2(Fk))[EV].mean() * 255
    print(k / 25, 'grid comp', round(e1, 2), 'dense-refined', round(e2, 2), flush=True)
