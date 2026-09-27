#!/usr/bin/env python3
# Camera-settle motion fields (23.12-23.52), measurement only -> ../data/settle.js
# For each settle frame and each layer: the layer's similarity model (SETTLE in ../../s05.js) warps the settled frame,
# DIS optical flow measures the rest, and the displacement of the layer's own (textured, visible) pixels is reduced to
# a coarse grid of vectors (weighted median per node, gaps filled, smoothed). The film warps each layer through its grid.
import numpy as np, cv2, json, os, sys, frames
from fill import pushpull
H, W = 946, 2206
SETTLE = {'room': [0.0459, -1.30, -163.0, 51.1, 600, 300], 'desk': [0.0639, -2.99, -111.5, 74.9, 700, 650],
          'fig': [0.0403, -0.65, 18.1, 26.2, 1650, 500], 'owl': [0.0182, -1.58, 47.9, 23.9, 1580, 440], 'lh': [0.0639, -2.99, -111.5, 74.9, 700, 650]}
GRID = {'room': 110, 'desk': 60, 'fig': 40, 'owl': 60, 'lh': 70}
# grid extent per layer (frame px, settled): a little beyond each layer's box
GBOX = {'room': (-120, -120, 2326, 1066), 'desk': (-120, 60, 1780, 1066), 'fig': (700, -120, 2326, 1066), 'owl': (1300, 120, 1880, 800), 'lh': (500, 560, 980, 980)}
KS = list(range(578, 589))
def U(t):
    x = (t - 23.12) / 0.4; return 0.0 if x >= 1 else (1 - max(0.0, x)) ** 1.85
def simM(name, t):
    s_, r_, dx, dy, cx, cy = SETTLE[name]; u = U(t); s = 1 + s_ * u; a = np.radians(r_ * u)
    A = np.array([[np.cos(a) * s, -np.sin(a) * s], [np.sin(a) * s, np.cos(a) * s]]); b = np.array([cx + dx * u, cy + dy * u]) - A @ np.array([cx, cy])
    return A, b
u8 = lambda x: np.clip(x * 255, 0, 255).astype(np.uint8)
def dis_flow(a, b):
    d = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    d.setFinestScale(1); d.setPatchSize(12); d.setPatchStride(4); d.setGradientDescentIterations(25); d.setVariationalRefinementIterations(5)
    return d.calc(u8(a), u8(b), None)

RIGID = {}
def load_rigid():
    T = frames.TRACKS
    parts = {'desk': [('lapbase', [[[408,683],[928,543],[1219,671],[686,866]], [[686,866],[1219,671],[1225,700],[690,896]], [[408,683],[686,866],[690,896],[402,704]]], 60)],
             'fig': [('face', [[[1318,262],[1296,305],[1290,322],[1303,332],[1330,370],[1343,388],[1360,400],[1372,430],[1390,470],[1405,505],[1440,515],[1445,420],[1430,330],[1400,262]]], 30),
                     ('pencil', [[[1392,392],[1204,451],[1158,475],[1203,478],[1392,420]]], 20)]}
    for L, ps in parts.items():
        for nm, polys, fe in ps:
            p = f'{T}/settle_{nm}.json'
            if not os.path.exists(p): continue
            m = np.zeros((H, W), np.uint8)
            for q in polys: cv2.fillPoly(m, [np.array(q, np.int32)], 1)
            RIGID.setdefault(L, []).append({'aff': {round(r[0] * 25): np.array(r[6]).reshape(2, 3) for r in json.load(open(p))},
                                            'dist': cv2.distanceTransform((1 - m).astype(np.uint8), cv2.DIST_L2, 5).astype(np.float32), 'feather': fe})

def main():
    load_rigid()
    S = frames.static_target().mean(2).astype(np.float32)
    M = dict(np.load(f'{frames.CACHE}/masks.npz'))
    gx = cv2.Sobel(cv2.GaussianBlur(S, (0, 0), 1.5), cv2.CV_32F, 1, 0); gy = cv2.Sobel(cv2.GaussianBlur(S, (0, 0), 1.5), cv2.CV_32F, 0, 1)
    tex = np.sqrt(gx * gx + gy * gy)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    out = {'ks': KS, 'layers': {}}
    for name in SETTLE:
        G = GRID[name]
        bx0, by0, bx1, by1 = GBOX[name]
        nx, ny = int(np.ceil((bx1 - bx0) / G)) + 1, int(np.ceil((by1 - by0) / G)) + 1
        vis = M[name] if name != 'fig' else (M['fig'])
        vis = cv2.erode(vis.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        # the screen changes page and the right hand changes drawing: neither says how the layer moved
        bad = np.zeros((H, W), np.uint8); cv2.fillPoly(bad, [np.array([[315, 246], [834, 168], [898, 519], [409, 648]])], 1)
        bad = cv2.erode(bad, np.ones((9, 9), np.uint8)) > 0     # (the page only: the bezel edges are good features)
        bad |= cv2.dilate((M['rh'] | M['arm'] | M['rhB'] | M['armB']).astype(np.uint8), np.ones((41, 41), np.uint8)) > 0
        vis &= ~bad
        grids = []
        for k in KS:
            t = k / 25; F = frames.pre(k).mean(2).astype(np.float32)
            A, b = simM(name, t)
            # settled -> model position; warp S forward by the model (inverse map for remap)
            Ai = np.linalg.inv(A)
            mapx = Ai[0, 0] * xx + Ai[0, 1] * yy + (Ai @ -b)[0]; mapy = Ai[1, 0] * xx + Ai[1, 1] * yy + (Ai @ -b)[1]
            SL = cv2.remap(S, mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            fl = dis_flow(SL, F)            # SL(q) ~ F(q + fl(q)), q = model position of settled p
            # displacement of settled pixel p: q = A p + b, final = q + fl(q)
            qx = A[0, 0] * xx + A[0, 1] * yy + b[0]; qy = A[1, 0] * xx + A[1, 1] * yy + b[1]
            fx = cv2.remap(fl[..., 0], qx, qy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=np.nan)
            fy = cv2.remap(fl[..., 1], qx, qy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=np.nan)
            dx = qx + fx - xx; dy = qy + fy - yy
            ok = vis & np.isfinite(dx) & (tex > 0.02)
            gdx = np.zeros((ny, nx), np.float32); gdy = np.zeros((ny, nx), np.float32); gw = np.zeros((ny, nx), np.float32)
            for j in range(ny):
                for i in range(nx):
                    cx, cy = bx0 + i * G, by0 + j * G
                    x0, x1, y0, y1 = int(max(0, cx - G)), int(min(W, cx + G)), int(max(0, cy - G)), int(min(H, cy + G))
                    if x1 <= x0 or y1 <= y0: continue
                    sel = ok[y0:y1, x0:x1]
                    if sel.sum() < 30: continue
                    w = tex[y0:y1, x0:x1][sel]
                    for arr, dst in ((dx, gdx), (dy, gdy)):
                        v = arr[y0:y1, x0:x1][sel]; o = np.argsort(v); cw = np.cumsum(w[o]); dst[j, i] = v[o][np.searchsorted(cw, cw[-1] / 2)]
                    gw[j, i] = min(1.0, sel.sum() / (G * G))
            known = gw > 0
            # fill the empty nodes from the layer's own model (residual 0) blended with neighbours
            mdx = (A[0, 0] - 1) * (bx0 + np.arange(nx) * G)[None, :] + A[0, 1] * (by0 + np.arange(ny) * G)[:, None] + b[0]
            mdy = A[1, 0] * (bx0 + np.arange(nx) * G)[None, :] + (A[1, 1] - 1) * (by0 + np.arange(ny) * G)[:, None] + b[1]
            rdx = pushpull(np.where(known, gdx - mdx, 0), known) if known.any() else np.zeros_like(gdx)
            rdy = pushpull(np.where(known, gdy - mdy, 0), known) if known.any() else np.zeros_like(gdy)
            rdx = cv2.GaussianBlur(rdx, (0, 0), 0.7); rdy = cv2.GaussianBlur(rdy, (0, 0), 0.7)
            gxx, gyy = mdx + rdx, mdy + rdy
            for part in RIGID.get(name, []):
                # rigid parts (the laptop base, his face, the pencil): their own affine track (settle_track.py, ECC)
                # replaces the flow there, feathered out over `feather` px
                if k not in part['aff']: continue
                Af = part['aff'][k]; nxs = bx0 + np.arange(nx) * G; nys = by0 + np.arange(ny) * G
                PX, PY = np.meshgrid(nxs, nys)
                ax_ = Af[0, 0] * PX + Af[0, 1] * PY + Af[0, 2] - PX; ay_ = Af[1, 0] * PX + Af[1, 1] * PY + Af[1, 2] - PY
                wgt = np.clip(1 - cv2.remap(part['dist'], PX.astype(np.float32), PY.astype(np.float32), cv2.INTER_LINEAR, borderValue=1e6) / part['feather'], 0, 1)
                gxx = gxx * (1 - wgt) + ax_ * wgt; gyy = gyy * (1 - wgt) + ay_ * wgt
            grids.append([np.round(gxx * 10).astype(int).tolist(), np.round(gyy * 10).astype(int).tolist()])
            print(name, k / 25, 'nodes', int(known.sum()), '/', nx * ny, 'median residual', float(np.median(np.abs(gdx - mdx)[known])) if known.any() else 0, flush=True)
        out['layers'][name] = {'x0': bx0, 'y0': by0, 'G': G, 'nx': nx, 'ny': ny, 'grids': grids}
    json.dump(out, open(f'{frames.CACHE}/settle_fields.json', 'w'))

if __name__ == '__main__':
    main()
