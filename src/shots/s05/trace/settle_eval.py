# compare the similarity model and the fitted grids by warping the settled frame's layers into each settle frame
import numpy as np, cv2, json, sys, frames
from settle_fit import simM, SETTLE, H, W
S = frames.static_target().mean(2).astype(np.float32)
M = dict(np.load(f'{frames.CACHE}/masks.npz'))
F = json.load(open(f'{frames.CACHE}/settle_fields.json'))
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
def grid_field(L, gi):
    g = F['layers'][L]; nx, ny, G = g['nx'], g['ny'], g['G']
    gdx = np.array(g['grids'][gi][0], np.float32) / 10; gdy = np.array(g['grids'][gi][1], np.float32) / 10
    # bilinear upsample to full frame
    X = (xx - g['x0']) / G; Y = (yy - g['y0']) / G
    dx = cv2.remap(gdx, X, Y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE); dy = cv2.remap(gdy, X, Y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    return dx, dy
def forward(img, dx, dy):
    # q = p + d(p): inverse map by fixed point p = q - d(p)
    px, py = xx.copy(), yy.copy()
    for _ in range(4):
        ddx = cv2.remap(dx, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE); ddy = cv2.remap(dy, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        px, py = xx - ddx, yy - ddy
    return cv2.remap(img, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
order = ['room', 'desk', 'lh', 'fig', 'owl']
EV = np.ones((H, W), np.uint8); cv2.fillPoly(EV, [np.array([[315, 246], [834, 168], [898, 519], [409, 648]])], 0)
EV = (cv2.erode(EV, np.ones((31, 31), np.uint8)) > 0) & ~(cv2.dilate((M['rh'] | M['arm'] | M['rhB'] | M['armB']).astype(np.uint8), np.ones((61, 61), np.uint8)) > 0)
lay = {'room': np.ones((H, W), bool), 'desk': M['desk'] | M['rh'] | M['arm'], 'lh': M['lh'], 'fig': M['fig'], 'owl': M['owl']}
for gi, k in enumerate(F['ks']):
    t = k / 25; Fk = frames.pre(k).mean(2)
    res = {}
    for mode in ('model', 'grid'):
        out = np.zeros((H, W), np.float32)
        for L in order:
            if mode == 'model':
                A, b = simM(L, t); dx = (A[0, 0] - 1) * xx + A[0, 1] * yy + b[0]; dy = A[1, 0] * xx + (A[1, 1] - 1) * yy + b[1]
            else: dx, dy = grid_field(L, gi)
            a = forward(lay[L].astype(np.float32), dx, dy); v = forward(S * lay[L], dx, dy)
            out = out * (1 - a) + v
        k2 = lambda x: cv2.GaussianBlur(x, (0, 0), 3)
        o2, f2 = k2(out), k2(Fk)
        sel = EV[::4, ::4]; X = xx[::4, ::4][sel] / W; Yv = yy[::4, ::4][sel] / H; o = o2[::4, ::4][sel]; f = f2[::4, ::4][sel]
        Am = np.stack([o, o * X, o * Yv], 1); cf = np.linalg.lstsq(Am, f, rcond=None)[0]
        gmap = cf[0] + cf[1] * xx / W + cf[2] * yy / H
        res[mode] = np.abs(o2 * gmap - f2)[EV].mean() * 255
        if mode == 'grid' and gi in (0, 2): cv2.imwrite(f'{frames.CACHE}/settle_grid_{k}.jpg', np.clip(np.hstack([out, Fk]) * 255, 0, 255).astype(np.uint8)[::2, ::2])
    print(f'{t:.2f} model {res["model"]:.2f} grid {res["grid"]:.2f}', flush=True)
