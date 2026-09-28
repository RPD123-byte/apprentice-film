#!/usr/bin/env python3
# Fine print texture per zone (not loaded by the film): the source's missing high-frequency energy in each zone
# (hp = x - blur(x, 1.2), energy of the target minus energy of the JS render) -> amplitude of tracekit's grain,
# scaled by the tone weight w(v) = min(1, 6 v (1 - v)). Writes LAYER.json["tex"] (one number per zone).
#   texture.py LAYER.json RENDER.png TARGET.npy x0,y0 [--excl polys.json] [--k 0.8]
import cv2, numpy as np, json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from raster import zone_ids_from, mesh_pattern, grain_pattern
Lp, Rp, Tp, box = sys.argv[1], sys.argv[2], sys.argv[3], [int(v) for v in sys.argv[4].split(",")]
K = float(sys.argv[sys.argv.index("--k") + 1]) if "--k" in sys.argv else 1.0
L = json.load(open(Lp)); x0, y0 = box
R = cv2.imread(Rp).astype(np.float32).mean(axis=2); H, W = R.shape
T = np.load(Tp); g = (T.mean(axis=2) * 255).astype(np.float32)[y0:y0 + H, x0:x0 + W]
zl = [dict(z, p=[[a - x0, b - y0] for a, b in z["p"]]) for z in L["zones"]]
ids = zone_ids_from(zl, H, W)
sel = np.ones((H, W), bool)
if "--excl" in sys.argv:
  for poly in json.load(open(sys.argv[sys.argv.index("--excl") + 1])):
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.round(np.array(poly) - [x0, y0]).astype(np.int32)], 1); sel &= m == 0
hp = lambda a: a - cv2.GaussianBlur(a, (0, 0), 1.2)
v = np.clip(R / 255, 0, 1); wv = np.minimum(1, 6 * v * (1 - v))
# pattern per zone: the print mesh on mid-tone cloth, stipple grain on the bright owl, skin and paper
zt = np.array([z["c"][0] / 255 for z in zl], np.float32)
mixw = np.clip((zt - 0.65) / 0.15, 0, 1); mixw = mixw * mixw * (3 - 2 * mixw)
MW = mixw[np.clip(ids, 0, len(zl) - 1)]
P = (mesh_pattern(H, W, x0, y0) * (1 - MW) + grain_pattern(H, W, x0, y0) * MW) * wv
es, er, ep = hp(g) ** 2, hp(R) ** 2, hp(P) ** 2
tex = []
for k in range(len(zl)):
  m = (ids == k) & sel
  if m.sum() < 30: tex.append(0.0); continue
  d = es[m].mean() - er[m].mean()
  tex.append(round(float(K * np.sqrt(max(0.0, d) / max(ep[m].mean(), 1e-3))), 2) if d > 0 else 0.0)
tex = np.minimum(np.array(tex), 25).tolist()
L["tex"] = tex
json.dump(L, open(Lp, "w"))
print("texture: zones with grain %d / %d, mean amp %.2f" % (sum(1 for t in tex if t > 0), len(tex), float(np.mean(tex))))
