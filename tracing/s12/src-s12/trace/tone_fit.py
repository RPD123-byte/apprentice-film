#!/usr/bin/env python3
# tone_fit.py render.png src.png geo.json prev.json out.json dbg.jpg [N]
# F4c: the hero's plumage VALUE STUDY, corrected against the source. Both frames are taken back to pre-finish values
# (degrade.py), blurred (sigma 6, normalised inside the lit plumage so edges and ink do not leak in) and differenced
# (source - render). The residual is fitted by greedy matching pursuit with round Gaussians of sigma 14 / 24 / 40 px
# (masked least squares), N per call; the result is APPENDED to prev.json. Output: control points only —
# [x, y, sigma, amplitude (1/255, pre-finish)] per blob; hero.js paints them as soft light / shade inside the
# silhouette before the ink goes on. The eyes, beak, plaster, headphones, feet and tail keep their own drawings
# (masked out of the fit).
import cv2, numpy as np, json, sys
from degrade import degrade
rp, sp, geo, prev, out, dbg = sys.argv[1:7]
N = int(sys.argv[7]) if len(sys.argv) > 7 else 40
G = json.load(open(geo))
r = degrade(cv2.imread(rp, 0).astype(np.float32)); s = degrade(cv2.imread(sp, 0).astype(np.float32))
H, W = r.shape
m = ((cv2.GaussianBlur(s, (0, 0), 3) > 110) & (cv2.GaussianBlur(r, (0, 0), 3) > 110)).astype(np.uint8)
ex = np.zeros((H, W), np.uint8)
def poly(pts, grow=0):
  q = np.zeros((H, W), np.uint8); cv2.fillPoly(q, [np.array(pts, np.int32)], 1)
  return cv2.dilate(q, np.ones((2 * grow + 1, 2 * grow + 1), np.uint8)) if grow else q
for e in (G["eyeR"], G["eyeL"]):
  cx, cy, rx, ry = e["ring"]; cv2.ellipse(ex, (int(cx), int(cy)), (int(rx + 10), int(ry + 10)), 0, 0, 360, 1, -1); ex |= poly(e["lid"], 10)
ex |= poly(G["beak"]["out"], 8); ex |= poly(G["bandage"]["pad"], 10)
a, b, w = G["bandage"]["long"]; ex |= cv2.line(np.zeros((H, W), np.uint8), tuple(map(int, a)), tuple(map(int, b)), 1, int(w + 20))
for k in ("cup", "arm", "block", "collar"): ex |= poly(G["hp"][k], 10)
for k in ("top", "low"): ex |= poly(G["farBand"][k], 8)
ex |= poly(G["tail"], 6); ex[840:, 1040:1480] = 1
m = cv2.erode(m, np.ones((7, 7), np.uint8)) * (1 - ex)
mf = m.astype(np.float32)
def nb(x, sg):
  return cv2.GaussianBlur(x * mf, (0, 0), sg) / (cv2.GaussianBlur(mf, (0, 0), sg) + 1e-3)
R = (nb(s, 6) - nb(r, 6)) * mf
print("before: mean |D|", float(np.abs(R[m > 0]).mean()), "signed", float(R[m > 0].mean()))
blobs = json.load(open(prev)) if prev != "-" else []
new = []
for it in range(N):
  best = None
  for sg in (14, 24, 40):
    num = cv2.GaussianBlur(R, (0, 0), sg)                         # <R, G_p>  (up to a constant)
    den = cv2.GaussianBlur(mf, (0, 0), sg / np.sqrt(2))           # <G_p^2, m> (same constant, gaussian^2 = gaussian/sqrt2)
    amp = 2 * num / np.maximum(den, 0.05)                         # least-squares amplitude of exp(-d^2/2sg^2)
    score = amp * num * (2 * np.pi * sg * sg)                     # squared-error reduction
    score[den < 0.25] = 0
    j = int(np.argmax(score)); y, x = divmod(j, W)
    if best is None or score[y, x] > best[0]: best = (float(score[y, x]), x, y, sg, float(amp[y, x]))
  _, x, y, sg, A = best
  A = float(np.clip(A, -40, 40))
  yy, xx = np.mgrid[0:H, 0:W]
  g = np.exp(-((xx - x) ** 2 + (yy - y) ** 2) / (2 * sg * sg)).astype(np.float32)
  R -= A * g * mf
  new.append([int(x), int(y), int(sg), round(A, 1)])
print("after : mean |D|", float(np.abs(R[m > 0]).mean()), "signed", float(R[m > 0].mean()), "blobs", len(new))
json.dump(blobs + new, open(out, "w"))
v = np.clip(R * 6 + 128, 0, 255).astype(np.uint8); col = cv2.applyColorMap(v, cv2.COLORMAP_JET); col[m == 0] = 0
for x, y, sg, A in new: cv2.circle(col, (x, y), sg, (255, 255, 255) if A > 0 else (0, 0, 0), 1)
cv2.imwrite(dbg, col[:, 600:2000], [1, 90])
