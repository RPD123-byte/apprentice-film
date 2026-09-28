#!/usr/bin/env python3
# owlface2.py -- fit the plaster (two rounded strips) and the beak (a kite) to the dark outlines of the hold frame
# (chamfer fit: outline samples against the distance to the nearest dark-line pixel). Prints the parameters.
import cv2, numpy as np, json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from grade import degrade
from scipy.optimize import minimize
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap = cv2.VideoCapture(V)
fi = 514; cap.set(1, fi); ok, f = cap.read(); G = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32)
P = degrade(G, fi / 25)
bgL = cv2.GaussianBlur(cv2.dilate(P, np.ones((9, 9), np.uint8)), (0, 0), 2)
dark = (((bgL - P) > 80) & (bgL > 190)).astype(np.uint8)   # dark lines on the lit head only
DT = cv2.distanceTransform(1 - dark, cv2.DIST_L2, 3)
def samp(pts): return cv2.remap(DT, pts[:, 0].astype(np.float32)[None], pts[:, 1].astype(np.float32)[None], cv2.INTER_LINEAR)[0]
def strip(cx, cy, th, L, w, n=120):
    # stadium: straight sides length L-w, semicircle ends radius w/2
    r = w / 2; a = max(0, L / 2 - r); pts = []
    for s in np.linspace(0, 1, n, endpoint=False):
        p = s * (4 * a + 2 * np.pi * r); 
        if p < 2 * a: q = (-a + p, -r)
        elif p < 2 * a + np.pi * r: t = (p - 2 * a) / r - np.pi / 2; q = (a + r * np.cos(t), r * np.sin(t))
        elif p < 4 * a + np.pi * r: q = (a - (p - 2 * a - np.pi * r), r)
        else: t = (p - 4 * a - np.pi * r) / r + np.pi / 2; q = (-a + r * np.cos(t), r * np.sin(t))
        pts.append(q)
    pts = np.array(pts); c, s_ = np.cos(th), np.sin(th)
    return np.c_[cx + pts[:, 0] * c - pts[:, 1] * s_, cy + pts[:, 0] * s_ + pts[:, 1] * c]
def cost(v):
    A = strip(*v[:5]); B = strip(*v[5:])
    pri = 0.002 * ((v[0] - x0[0]) ** 2 + (v[1] - x0[1]) ** 2 + (v[5] - x0[5]) ** 2 + (v[6] - x0[6]) ** 2)
    return float(np.mean(np.minimum(samp(A), 6) ** 2) + np.mean(np.minimum(samp(B), 6) ** 2)) + pri
x0 = [1620.5, 241, np.radians(-30.3), 75, 16, 1622.5, 245.5, np.radians(25.2), 57, 16]
best = None
for dth in (-0.1, 0, 0.1):
    v0 = list(x0); v0[2] += dth; v0[7] -= dth
    r = minimize(cost, v0, method='Nelder-Mead', options={'maxiter': 6000, 'xatol': 0.05, 'fatol': 1e-4})
    if best is None or r.fun < best.fun: best = r
v = best.x
pl = [{"c": [round(v[0], 1), round(v[1], 1)], "a": round(float(np.degrees(v[2])), 1), "L": round(v[3], 1), "w": round(v[4], 1)},
      {"c": [round(v[5], 1), round(v[6], 1)], "a": round(float(np.degrees(v[7])), 1), "L": round(v[8], 1), "w": round(v[9], 1)}]
print("plaster", json.dumps(pl), "cost", round(best.fun, 3))
def kite(v, n=30):
    p = np.array(v).reshape(4, 2); out = []
    for i in range(4):
        a, b = p[i], p[(i + 1) % 4]
        for s in np.linspace(0, 1, n, endpoint=False): out.append(a + (b - a) * s)
    return np.array(out)
kc = lambda v: float(np.mean(np.minimum(samp(kite(v)), 6) ** 2))
k0 = [1666, 365, 1681, 381, 1668, 404, 1652, 378]
rk = minimize(kc, k0, method='Nelder-Mead', options={'maxiter': 8000, 'xatol': 0.05})
print("beak", [round(x, 1) for x in rk.x], "cost", round(rk.fun, 3))
# values
yy, xx = np.mgrid[0:P.shape[0], 0:P.shape[1]]
pk = kite(rk.x); mk = np.zeros(P.shape, np.uint8); cv2.fillPoly(mk, [np.round(np.array(rk.x).reshape(4, 2)).astype(np.int32)], 1)
mk = cv2.erode(mk, np.ones((5, 5), np.uint8))
print("beak fill", float(np.median(P[mk > 0])), "outline", float(np.percentile(P[dark > 0][:], 10)))
ms = np.zeros(P.shape, np.uint8)
for s in pl:
    q = strip(s["c"][0], s["c"][1], np.radians(s["a"]), s["L"], s["w"]); cv2.fillPoly(ms, [np.round(q).astype(np.int32)], 1)
ms = cv2.erode(ms, np.ones((5, 5), np.uint8))
print("plaster fill median", float(np.median(P[ms > 0])), "p10", float(np.percentile(P[ms > 0], 10)))
# outline darkness along the plaster/beak outlines
for nm, q in [("plasterA", strip(v[0], v[1], v[2], v[3], v[4])), ("plasterB", strip(*v[5:])), ("beak", pk)]:
    vals = cv2.remap(cv2.erode(P, np.ones((3, 3), np.uint8)), q[:, 0].astype(np.float32)[None], q[:, 1].astype(np.float32)[None], cv2.INTER_LINEAR)[0]
    print(nm, "outline value median", float(np.median(vals)))
