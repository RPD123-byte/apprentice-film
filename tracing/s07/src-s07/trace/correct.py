#!/usr/bin/env python3
# Value correction for a traced layer (not loaded by the film): LAYER.json + a pre-grade render of that layer by
# tracekit.js (RENDER.png) + the target -> adds to LAYER.json["corr"] the per-zone quadratic of the smoothed residual
# (target - render), excluding pixels the layer never shows (EXCL polygons). tracekit.js adds box3(field(corr)).
#   correct.py LAYER.json RENDER.png TARGET.npy|TARGET.png BOX(x0,y0) [--excl poly.json]
import cv2, numpy as np, json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from raster import zone_ids_from, box3, gblur, fill_poly_ids
from raster import fit_zone_coeffs, zone_field
Lp, Rp, Tp, box = sys.argv[1], sys.argv[2], sys.argv[3], [int(v) for v in sys.argv[4].split(",")]
L = json.load(open(Lp))
x0, y0 = box
R = cv2.imread(Rp).astype(np.float32).mean(axis=2)
T = np.load(Tp) if Tp.endswith(".npy") else cv2.imread(Tp).astype(np.float32) / 255
g = (T.mean(axis=2) * 255).astype(np.float32) if T.ndim == 3 else T
H, W = R.shape
g = g[y0:y0 + H, x0:x0 + W]
zl = [dict(z, mx=z["mx"] - x0, my=z["my"] - y0, p=[[a - x0, b - y0] for a, b in z["p"]]) for z in L["zones"]]
ids = zone_ids_from(zl, H, W)
sel = np.ones((H, W), bool)
if "--excl" in sys.argv:
  for poly in json.load(open(sys.argv[sys.argv.index("--excl") + 1])):
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.round(np.array(poly) - [x0, y0]).astype(np.int32)], 1); sel &= m == 0
r = gblur(g - R, 2)
mae = lambda A: np.abs(gblur(A, 8))[sel].mean()
print("residual mae8 before %.2f" % mae(g - R))
dc = fit_zone_coeffs(ids, len(zl), r, sel)
zz = [dict(z, c=c) for z, c in zip(zl, dc)]
F = box3(zone_field(ids, zz, H, W))
print("predicted after %.2f" % mae(g - R - F))
old = L.get("corr") or [[0.0] * 6 for _ in zl]
L["corr"] = [[round(a + b, 3) for a, b in zip(o, d)] for o, d in zip(old, dc)]
json.dump(L, open(Lp, "w"))
