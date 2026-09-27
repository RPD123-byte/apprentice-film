#!/usr/bin/env python3
# plaster_fit.py FI x0 y0 x1 y1 -- fit the owl's plaster (two crossed stadium strips) to the skeleton of its dark
# outline (symmetric chamfer: data->model and model->data, truncated). Prints the strip parameters (frame px).
import cv2, numpy as np, json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from grade import degrade
from scipy.optimize import minimize
from scipy.spatial import cKDTree
from skimage.morphology import skeletonize, remove_small_objects
fi = int(sys.argv[1]); x0, y0, x1, y1 = [int(v) for v in sys.argv[2:6]]
init = json.loads(sys.argv[6]) if len(sys.argv) > 6 else None
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap = cv2.VideoCapture(V); cap.set(1, fi); ok, f = cap.read()
P = degrade(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32), fi / 25)
c = P[y0:y1, x0:x1]
bgL = cv2.GaussianBlur(cv2.dilate(c, np.ones((9, 9), np.uint8)), (0, 0), 2)
bgD = cv2.erode(c, np.ones((15, 15), np.uint8))
m = ((bgL - c) > 70) & (bgL > 190) & (cv2.GaussianBlur(c, (0, 0), 6) > 150)
m = remove_small_objects(m, max_size=40)
sk = skeletonize(m); ys, xs = np.nonzero(sk)
D = np.c_[xs + x0, ys + y0].astype(float)
def strip(cx, cy, th, L, w, n=160):
    r = w / 2; a = max(0, L / 2 - r); per = 4 * a + 2 * np.pi * r; pts = []
    for p in np.linspace(0, per, n, endpoint=False):
        if p < 2 * a: q = (-a + p, -r)
        elif p < 2 * a + np.pi * r: t = (p - 2 * a) / r - np.pi / 2; q = (a + r * np.cos(t), r * np.sin(t))
        elif p < 4 * a + np.pi * r: q = (a - (p - 2 * a - np.pi * r), r)
        else: t = (p - 4 * a - np.pi * r) / r + np.pi / 2; q = (-a + r * np.cos(t), r * np.sin(t))
        pts.append(q)
    pts = np.array(pts); cs, sn = np.cos(th), np.sin(th)
    return np.c_[cx + pts[:, 0] * cs - pts[:, 1] * sn, cy + pts[:, 0] * sn + pts[:, 1] * cs]
td = cKDTree(D)
def cost(v):
    A = strip(*v[:5]); B = strip(*v[5:]); Mdl = np.vstack([A, B])
    d1 = np.minimum(cKDTree(Mdl).query(D)[0], 5) ** 2
    d2 = np.minimum(td.query(Mdl)[0], 5) ** 2
    return float(d1.mean() + 0.5 * d2.mean())
best = None
rng = np.random.default_rng(1)
starts = [init] if init else []
cxm, cym = D[:, 0].mean(), D[:, 1].mean()
for k in range(40):
    starts.append([cxm + rng.uniform(-8, 8), cym + rng.uniform(-8, 8), np.radians(rng.uniform(-50, -15)), rng.uniform(55, 80), rng.uniform(14, 20),
                   cxm + rng.uniform(-8, 8), cym + rng.uniform(-8, 8), np.radians(rng.uniform(15, 50)), rng.uniform(50, 75), rng.uniform(14, 20)])
for s0 in starts:
    r = minimize(cost, s0, method='Nelder-Mead', options={'maxiter': 4000, 'xatol': 0.02, 'fatol': 1e-5})
    if best is None or r.fun < best.fun: best = r
v = best.x
res = [{"c": [round(v[0], 1), round(v[1], 1)], "a": round(float(np.degrees(v[2])), 1), "L": round(v[3], 1), "w": round(v[4], 1)},
       {"c": [round(v[5], 1), round(v[6], 1)], "a": round(float(np.degrees(v[7])), 1), "L": round(v[8], 1), "w": round(v[9], 1)}]
print(json.dumps(res), round(best.fun, 3), len(D))
if os.environ.get("VIS"):
    z = 8; vis = cv2.cvtColor(cv2.resize(np.clip(c, 0, 255).astype(np.uint8), None, fx=z, fy=z, interpolation=cv2.INTER_NEAREST), cv2.COLOR_GRAY2BGR)
    for x, y in D: cv2.circle(vis, (int((x - x0) * z + z / 2), int((y - y0) * z + z / 2)), 2, (0, 0, 255), -1)
    for s, col in zip(res, [(0, 255, 0), (255, 128, 0)]):
        q = strip(s["c"][0], s["c"][1], np.radians(s["a"]), s["L"], s["w"]); q = np.round((q - [x0, y0]) * z + z / 2).astype(np.int32)
        cv2.polylines(vis, [q], True, col, 2)
    cv2.imwrite(os.environ["VIS"], vis)
