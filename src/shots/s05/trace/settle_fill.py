#!/usr/bin/env python3
# What the camera settle uncovers: room and desk content hidden in the settled frame (behind the figure, under the left
# hand, ...) but visible in the settle frames 23.12-23.36. Each frame is mapped back to settled coordinates through the
# layer's own motion grid (settle_fit.py), its exposure matched to the settled frame, and averaged where that layer is
# not covered. Writes CACHE/settle_fill.npz (measurement pipeline; build.py uses it for the layers' hidden parts).
import numpy as np, cv2, json, frames
from settle_fit import H, W
S = frames.static_target().mean(2).astype(np.float32)
M = dict(np.load(f'{frames.CACHE}/masks.npz'))
F = json.load(open(f'{frames.CACHE}/settle_fields.json'))
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
def field(L, gi, gx=None, gy=None):
    gx = xx if gx is None else gx; gy = yy if gy is None else gy
    g = F['layers'][L]; G = g['G']
    gdx = np.array(g['grids'][gi][0], np.float32) / 10; gdy = np.array(g['grids'][gi][1], np.float32) / 10
    X = (gx - g['x0']) / G; Y = (gy - g['y0']) / G
    return (cv2.remap(gdx, X, Y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE), cv2.remap(gdy, X, Y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE))
# the room also reaches past the frame (its layer box): its fill is made on that larger canvas
RBOX = (-60, -80, 2366, 986)
ey, ex = np.mgrid[RBOX[1]:RBOX[3], RBOX[0]:RBOX[2]].astype(np.float32)
def forward(img, dx, dy):
    px, py = xx.copy(), yy.copy()
    for _ in range(4):
        ddx = cv2.remap(dx, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE); ddy = cv2.remap(dy, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        px, py = xx - ddx, yy - ddy
    return cv2.remap(img, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
# hand drawings (pose B) and their per-frame translation during the settle (s05.js HAND_RB / HAND_AB)
RB = {578: (-83.8, 59.6), 579: (-69.5, 48.4), 580: (-56.9, 38.8), 581: (-46.1, 30.5), 582: (-37.5, 24.1), 583: (-27.6, 16.2), 584: (-20.0, 10.4)}
AB = {578: (-61.8, 46.7), 579: (-51.0, 38.0), 580: (-42.1, 31.0), 581: (-34.3, 24.9), 582: (-27.9, 20.0), 583: (-20.7, 13.9), 584: (-15.2, 9.4)}
sh = lambda m, d: cv2.warpAffine(m.astype(np.float32), np.float32([[1, 0, d[0]], [0, 1, d[1]]]), (W, H))
# the left hand as drawn (s05.js LH_SET: centre shift, scale, rotation about C_L = (740, 755))
LH = {578: (-68.0, 84.0, 1.095, -2.8), 579: (-55.3, 68.3, 1.080, -2.18), 580: (-45.6, 55.2, 1.067, -1.59), 581: (-36.7, 43.3, 1.047, -1.21), 582: (-29.5, 33.8, 1.037, -0.91), 583: (-20.8, 23.3, 1.024, -0.55), 584: (-13.8, 15.4, 1.016, -0.38)}
def lh_mask(k):
    dx, dy, s, r = LH[k]; a = np.radians(r); cx, cy = 740, 755
    A = np.array([[np.cos(a) * s, -np.sin(a) * s], [np.sin(a) * s, np.cos(a) * s]]); b = np.array([cx + dx, cy + dy]) - A @ np.array([cx, cy])
    return cv2.warpAffine(M['lh'].astype(np.float32), np.hstack([A, b[:, None]]).astype(np.float32), (W, H))
out = {}
for L, occl in (('room', ['desk', 'lh', 'fig', 'owl', 'hands']), ('desk', ['lh', 'fig', 'owl', 'hands']), ('fig', ['owl'])):
    shp = ex.shape if L == 'room' else (H, W)
    acc = np.zeros(shp, np.float32); wacc = np.zeros(shp, np.float32)
    for gi, k in enumerate(F['ks'][:7]):
        Fk = frames.pre(k).mean(2).astype(np.float32)
        occ = np.zeros((H, W), np.float32)
        for o in occl:
            if o == 'hands': occ = np.maximum(occ, np.maximum(sh(M['rhB'], RB[k]), sh(M['armB'], AB[k])))
            elif o == 'lh': occ = np.maximum(occ, lh_mask(k))
            else:
                src = (M['desk'] | M['rh'] | M['arm']) if o == 'desk' else M[o]
                occ = np.maximum(occ, forward(src.astype(np.float32), *field(o, gi)))
        er = 21 if L == 'fig' else 13 if L == 'room' else 7
        free = cv2.erode((occ < 0.05).astype(np.uint8), np.ones((er, er), np.uint8)).astype(np.float32)
        GX, GY = (ex, ey) if L == 'room' else (xx, yy)
        dx, dy = field(L, gi, GX, GY)
        back = cv2.remap(Fk, GX + dx, GY + dy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        wb = cv2.remap(free, GX + dx, GY + dy, cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        inb = ((GX + dx) >= 2) & ((GX + dx) < W - 2) & ((GY + dy) >= 2) & ((GY + dy) < H - 2)
        wb = wb * inb
        # exposure: gain field a + b x + c y fitted where this layer is visible in both the settled frame and here
        Sx = S if L != 'room' else cv2.copyMakeBorder(S, 80, 40, 60, 160, cv2.BORDER_CONSTANT, value=0)
        Mx = M[L] if L != 'room' else cv2.copyMakeBorder(M[L].astype(np.uint8), 80, 40, 60, 160, cv2.BORDER_CONSTANT, value=0) > 0
        both = (wb > 0) & Mx
        bb, ss = cv2.GaussianBlur(back, (0, 0), 3), cv2.GaussianBlur(Sx, (0, 0), 3)
        sel = both[::4, ::4]
        if sel.sum() > 100:
            X = GX[::4, ::4][sel] / W; Yv = GY[::4, ::4][sel] / H; b_ = bb[::4, ::4][sel]; s_ = ss[::4, ::4][sel]
            cf = np.linalg.lstsq(np.stack([b_, b_ * X, b_ * Yv], 1), s_, rcond=None)[0]
            g = cf[0] + cf[1] * GX / W + cf[2] * GY / H
        else: g = 1.0
        w = wb * (1.0 + gi)                 # later frames are sharper
        acc += back * g * w; wacc += w
        print(L, k / 25, 'free px', int((wb > 0).sum()), flush=True)
    out[L] = np.where(wacc > 0, acc / np.maximum(wacc, 1e-6), 0).astype(np.float32); out[L + '_w'] = (wacc > 0).astype(np.uint8)
np.savez_compressed(f'{frames.CACHE}/settle_fill.npz', **out)
vis = np.hstack([out['room'][80:80 + H, 60:60 + W], out['desk']]); cv2.imwrite(f'{frames.CACHE}/settle_fill.jpg', np.clip(vis * 255, 0, 255).astype(np.uint8)[::2, ::2])
