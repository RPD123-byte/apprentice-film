#!/usr/bin/env python3
# scisfit.py -- python mirror of src/shots/s25/v2/scis.js geometry + a chamfer / brightness fit of a placement to a
# source frame. Placement pl = dict(P=[x,y], a=[thA, thB], s=scale, m=+-1, rr=[r0, r1]).
import cv2, numpy as np, json, sys, os
from scipy.optimize import minimize
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s25-src/f%05d.png'
DESIGN = dict(L=153, w=17, D=[110, 95], bend=[0.227, -0.227], ring=[[32, 21, 0], [31, 22, 0.13]], t=9, screw=5.5, shankW=[10, 7])

def bez(p0, p1, p2, p3, n=16):
    t = np.linspace(0, 1, n)[:, None]
    return (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3
def blade_pts(P, th, s, side, D, ws=1.0):
    L, w = D['L'] * s, D['w'] * s * ws
    u = np.array([np.cos(th), np.sin(th)]); nrm = np.array([-np.sin(th), np.cos(th)]) * side
    pt = lambda t, k: np.array(P) + u * t + nrm * k
    a = pt(-0.06 * L, -0.25 * w)
    c1 = bez(a, pt(0.02 * L, 1.1 * w), pt(0.18 * L, 1.05 * w), pt(0.3 * L, 1.02 * w))
    c2 = bez(pt(0.3 * L, 1.02 * w), pt(0.62 * L, 0.95 * w), pt(0.9 * L, 0.45 * w), pt(L, 0.04 * w))
    c3 = bez(pt(L, 0.04 * w), pt(0.7 * L, -0.12 * w), pt(0.3 * L, -0.2 * w), a)
    return np.vstack([c1, c2, c3])
def ell_pts(cx, cy, rx, ry, rot, n=48):
    t = np.linspace(0, 2 * np.pi, n, endpoint=False)
    x, y = rx * np.cos(t), ry * np.sin(t)
    return np.stack([cx + x * np.cos(rot) - y * np.sin(rot), cy + x * np.sin(rot) + y * np.cos(rot)], 1)
def half_geo(pl, k, D=DESIGN):
    s, m, th, P = pl.get('s', 1), pl.get('m', 1), pl['a'][k], pl['P']
    rx, ry, rr = D['ring'][k]
    rsk = pl.get('rs', [1, 1])[k]; rx, ry = rx * rsk, ry * rsk
    a = th + np.pi + (D['bend'][k] + pl.get('rb', [0, 0])[k]) * m; d = (D['D'][k] + pl.get('rd', [0, 0])[k]) * s
    cx, cy = P[0] + np.cos(a) * d, P[1] + np.sin(a) * d
    rot = a + (rr + (pl.get('rr', [0, 0])[k])) * m
    side = (1 if k == 0 else -1) * m
    nx, ny = np.cos(a), np.sin(a); px, py = -ny, nx
    w0, w1, e = D['shankW'][0] * s / 2, D['shankW'][1] * s / 2, (D['D'][k] + pl.get('rd', [0, 0])[k] - rx * 0.8) * s
    shank = np.array([[P[0] + px * w0, P[1] + py * w0], [P[0] + nx * e + px * w1 * 1.6, P[1] + ny * e + py * w1 * 1.6],
                      [P[0] + nx * e - px * w1 * 1.6, P[1] + ny * e - py * w1 * 1.6], [P[0] - px * w0, P[1] - py * w0]])
    return dict(blade=blade_pts(P, th, s, side, D, pl.get('ws', 1.0)), shank=shank, outer=ell_pts(cx, cy, rx * s, ry * s, rot),
                inner=ell_pts(cx, cy, rx * s - D['t'] * s * rsk, ry * s - D['t'] * s * rsk, rot))
def mask(pl, shape, D=DESIGN):
    m = np.zeros(shape, np.uint8); holes = np.zeros(shape, np.uint8)
    for k in (1, 0):
        G = half_geo(pl, k, D)
        for nm in ('blade', 'shank', 'outer'):
            cv2.fillPoly(m, [np.round(G[nm] * 8).astype(np.int32)], 1, cv2.LINE_8, shift=3)
        cv2.fillPoly(holes, [np.round(G['inner'] * 8).astype(np.int32)], 1, cv2.LINE_8, shift=3)
    return m, holes
def outline(pl, D=DESIGN):
    pts = []
    for k in (0, 1):
        G = half_geo(pl, k, D)
        pts += [G['blade'], G['outer'], G['inner']]
    return np.vstack(pts)

def vec(pl): return np.array([pl['P'][0], pl['P'][1], pl['a'][0], pl['a'][1], pl.get('s', 1), *pl.get('rr', [0, 0]), *pl.get('rd', [0, 0]), *pl.get('rb', [0, 0]), *pl.get('rs', [1, 1]), pl.get('ws', 1.0)])
def unvec(v, m): return dict(P=[float(v[0]), float(v[1])], a=[float(v[2]), float(v[3])], s=float(v[4]), m=m, rr=[float(v[5]), float(v[6])], rd=[float(v[7]), float(v[8])], rb=[float(v[9]), float(v[10])], rs=[float(v[11]), float(v[12])], ws=float(v[13]))

def fit(f, pl, occl=None, box=None, iters=400, wb=1.0, fixed=()):
    g = cv2.imread(SRC % f, 0)
    gb = cv2.GaussianBlur(g, (0, 0), 1.2).astype(np.float32) / 255
    ed = cv2.Canny(cv2.GaussianBlur(g, (0, 0), 1.0), 40, 110)
    dt = cv2.distanceTransform((ed == 0).astype(np.uint8), cv2.DIST_L2, 3)
    occ = np.zeros(g.shape, np.uint8)
    if occl is not None:
        for pg in occl: cv2.fillPoly(occ, [np.array(pg, np.int32)], 1)
    v0 = vec(pl); m = pl.get('m', 1)
    def cost(v):
        v = v.copy()
        for i in fixed: v[i] = v0[i]
        q = unvec(v, m)
        o = outline(q)
        xi = np.clip(np.round(o[:, 0]).astype(int), 0, g.shape[1] - 1); yi = np.clip(np.round(o[:, 1]).astype(int), 0, g.shape[0] - 1)
        vis = occ[yi, xi] == 0
        c1 = np.minimum(dt[yi, xi], 6.0)[vis].mean() if vis.any() else 6
        mk, hl = mask(q, g.shape)
        inside = (mk > 0) & (hl == 0) & (occ == 0)
        c2 = (1 - gb[inside]).mean() if inside.any() else 1
        pen = 40 * max(0, abs(v[4] / v0[4] - 1) - 0.12) + 20 * max(0, abs(v[5]) - 0.5) + 20 * max(0, abs(v[6]) - 0.5)
        pen += 30 * max(0, abs(v[13] - 1) - 0.4)
        pen += 30 * max(0, abs(v[11] - 1) - 0.35) + 30 * max(0, abs(v[12] - 1) - 0.35)
        pen += 1 * max(0, abs(v[7]) - 25) + 1 * max(0, abs(v[8]) - 25) + 30 * max(0, abs(v[9]) - 0.35) + 30 * max(0, abs(v[10]) - 0.35)
        return c1 + wb * 8 * c2 + pen
    r = minimize(cost, v0, method='Powell', options=dict(maxiter=iters, xtol=0.01, ftol=1e-4))
    v = r.x
    for i in fixed: v[i] = v0[i]
    return unvec(v, m), cost(v0), r.fun

def overlay(f, pls, out, box):
    im = cv2.imread(SRC % f)
    for pl in pls:
        for k in (0, 1):
            G = half_geo(pl, k)
            for nm, col in (('blade', (0, 0, 255)), ('outer', (0, 255, 0)), ('inner', (255, 0, 0)), ('shank', (0, 255, 255))):
                cv2.polylines(im, [np.round(G[nm] * 8).astype(np.int32)], True, col, 1, cv2.LINE_AA, shift=3)
        cv2.circle(im, (int(pl['P'][0]), int(pl['P'][1])), 3, (255, 0, 255), 1)
    x0, y0, x1, y1 = box
    cv2.imwrite(out, cv2.resize(im[y0:y1, x0:x1], None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC))
