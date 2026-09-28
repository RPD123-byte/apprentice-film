#!/usr/bin/env python3
# s07 hands (not loaded by the film). The fingers are the only moving thing in the shot. One source frame (BASE) is
# traced inside the hands box like the plate; for every source frame the backward optical flow frame -> BASE is
# measured (DIS), regularised (confidence-weighted smoothing inside the moving-region mask, zero outside) and sampled
# on a GRID px lattice. tracekit.js warps the traced base by it per frame. Output WORK/hands.json.
import cv2, numpy as np, json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from layer import trace_layer, offset
from grade import inverse
WORK = sys.argv[1]
BASE = 14; BOX = (560, 470, 1200, 860); GRID = 8
X0, Y0, X1, Y1 = BOX
G = json.load(open(WORK + "/gains.json"))["gains"]
fr = [cv2.imread(WORK + "/frames/f_%02d.png" % i).astype(np.float32) / G[i] for i in range(38)]
grey = [cv2.cvtColor(np.clip(f, 0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY) for f in fr]
# moving-region mask: temporal std of the lightly blurred frames
st = np.stack([cv2.GaussianBlur(g.astype(np.float32), (0, 0), 2) for g in grey[1:]]).std(0)
m = (st > 6).astype(np.uint8); m[:, :480] = 0; m[:430, :] = 0; m[900:, :] = 0; m[:560, :] = np.where(np.arange(m.shape[1]) < 760, 0, 1)[None, :] * m[:560, :]
n, lab, sta, _ = cv2.connectedComponentsWithStats(m)
keep = np.zeros_like(m)
for i in range(1, n):
  if sta[i, 4] > 40: keep[lab == i] = 1
mm = cv2.morphologyEx(cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41))), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (61, 61)))
# fill holes (the back of the hands between moving outlines)
ff = mm.copy(); h, w = ff.shape; fm = np.zeros((h + 2, w + 2), np.uint8); cv2.floodFill(ff, fm, (0, 0), 1); mm = mm | (1 - ff)
draw = cv2.dilate(mm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
cs, _ = cv2.findContours(draw[Y0:Y1, X0:X1].copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
cs = [c for c in cs if cv2.contourArea(c) > 2000]
mask_polys = [(cv2.approxPolyDP(c, 2.0, True)[:, 0, :] + [X0, Y0]).tolist() for c in cs]
# trace the base frame in the box
Tb = inverse(np.clip(fr[BASE] / 255, 0, 1), 29.6); np.save(WORK + "/Tb.npy", Tb.astype(np.float32)); gb = (Tb.mean(axis=2) * 255).astype(np.float32)[Y0:Y1, X0:X1]
KEYS = [(450 - X0, 690 - Y0), (960 - X0, 545 - Y0), (1045 - X0, 640 - Y0), (600 - X0, 795 - Y0)]
L, R = trace_layer(gb, 220, keys=KEYS, broad=False)   # no soft shading strokes on the skin: they read as smudges
offset(L, X0, Y0)
cv2.imwrite(WORK + "/hands_base_py.png", np.clip(R, 0, 255).astype(np.uint8))
# flow per frame (backward: out_i(p) = base(p + f_i(p)))
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
PAD = 24; bx0, by0, bx1, by1 = X0 - PAD, Y0 - PAD, X1 + PAD, Y1 + PAD
I0 = np.ascontiguousarray(grey[BASE][by0:by1, bx0:bx1])
gx = cv2.Sobel(I0.astype(np.float32), cv2.CV_32F, 1, 0); gy = cv2.Sobel(I0.astype(np.float32), cv2.CV_32F, 0, 1)
conf = cv2.GaussianBlur(np.hypot(gx, gy), (0, 0), 2); conf = np.clip(conf / 60, 0, 1)
mb = mm[by0:by1, bx0:bx1].astype(np.float32)
soft = cv2.GaussianBlur(cv2.erode(mm, np.ones((9, 9), np.uint8)).astype(np.float32), (0, 0), 6)[by0:by1, bx0:bx1]
wgt = conf * mb
SIG = float(os.environ.get("FSIG", "3"))
flows = []
for i in range(38):
  I1 = np.ascontiguousarray(grey[i][by0:by1, bx0:bx1])
  f = dis.calc(I1, I0, None)
  num = cv2.GaussianBlur(f * wgt[..., None], (0, 0), SIG); den = cv2.GaussianBlur(wgt, (0, 0), SIG)
  fs = num / np.maximum(den, 1e-3)[..., None]; fs[den < 0.02] = 0
  fs *= soft[..., None]
  flows.append(fs[PAD:-PAD, PAD:-PAD])
gw, gh = (X1 - X0) // GRID + 1, (Y1 - Y0) // GRID + 1
Q = np.zeros((38, gh, gw, 2), np.int8)
for i, f in enumerate(flows):
  s = f[::GRID, ::GRID][:gh, :gw]
  Q[i, :s.shape[0], :s.shape[1]] = np.clip(np.round(s * 4), -127, 127).astype(np.int8)
# the shot's first frame (29.04, right after the cut) has the right hand in a pose the flow cannot reach (the index
# ~25 px higher): it gets its own traced layer, drawn unwarped through a mask grown to cover both poses
T0 = inverse(np.clip(fr[0] / 255, 0, 1), 29.6); np.save(WORK + "/Tb1.npy", T0.astype(np.float32)); g0 = (T0.mean(axis=2) * 255).astype(np.float32)[Y0:Y1, X0:X1]
L1, _ = trace_layer(g0, 220, keys=KEYS, broad=False)
offset(L1, X0, Y0)
dif = (np.abs(cv2.GaussianBlur(grey[0].astype(np.float32), (0, 0), 2) - cv2.GaussianBlur(grey[BASE].astype(np.float32), (0, 0), 2)) > 14).astype(np.uint8)
dif[:, :560] = 0; dif[:470, :] = 0; dif[:560, :760] = 0
m1 = cv2.dilate(mm | cv2.dilate(dif, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31))), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
cs1, _ = cv2.findContours(m1[Y0:Y1, X0:X1].copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
mask1 = [(cv2.approxPolyDP(c, 2.0, True)[:, 0, :] + [X0, Y0]).tolist() for c in cs1 if cv2.contourArea(c) > 2000]
json.dump({"box": BOX, "grid": GRID, "gw": gw, "gh": gh, "base": BASE, "mask": mask_polys, "layer": L, "layer1": L1, "mask1": mask1, "own": [0]}, open(WORK + "/hands.json", "w"))
np.save(WORK + "/hands_flow.npy", Q)
# evaluation: warp the python mirror of the base layer by the gridded flow, vs each frame's pre-grade grey
hh, ww = Y1 - Y0, X1 - X0
yy, xx = np.mgrid[0:hh, 0:ww].astype(np.float32)
tot = [0, 0]
for i in range(38):
  q = Q[i].astype(np.float32) / 4
  fu = cv2.resize(q, (ww + GRID * 0, hh), interpolation=cv2.INTER_LINEAR)  # approx; JS does exact bilinear on the lattice
  gxi = xx / GRID; gyi = yy / GRID
  fx = cv2.remap(q[..., 0], gxi, gyi, cv2.INTER_LINEAR); fy = cv2.remap(q[..., 1], gxi, gyi, cv2.INTER_LINEAR)
  out = cv2.remap(R, xx + fx, yy + fy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
  Ti = (inverse(np.clip(fr[i] / 255, 0, 1), 29.6).mean(axis=2) * 255)[Y0:Y1, X0:X1]
  bl = lambda a: cv2.GaussianBlur(a, (0, 0), 2)
  e0 = np.abs(bl(R) - bl(Ti))[mm[Y0:Y1, X0:X1] > 0].mean(); e1 = np.abs(bl(out) - bl(Ti))[mm[Y0:Y1, X0:X1] > 0].mean()
  tot[0] += e0; tot[1] += e1
  print("frame %2d  static %.2f  warped %.2f" % (i, e0, e1))
print("mean static %.2f warped %.2f" % (tot[0] / 38, tot[1] / 38))
