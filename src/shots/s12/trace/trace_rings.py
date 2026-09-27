#!/usr/bin/env python3
# trace_rings.py s850.png s880.png geo.json out.js
# F4c: the black ring round each eye (stare 850, glare 880) as a measured CENTRE-LINE: for every degree round the
# ring ellipse of geo.js (mapped through the glare's head rig), the outermost dark run (< 110 in pre-finish values,
# degrade.py) that has the white crescent inside it; its middle and width are kept, smoothed along the ring and split
# where the ring is hidden (under the lid). Writes control points only: runs of [x, y, w] per eye.
import cv2, numpy as np, json, sys
from degrade import degrade
s850, s880, geo, out = sys.argv[1:5]
G = json.load(open(geo))
RIG = {"stare": None, "glare": ([1000, 350], -0.0459, [-12.9, 27.6])}
res = {}
for st, fn, t in (("stare", s850, 34.0), ("glare", s880, 35.2)):
  b = cv2.GaussianBlur(degrade(cv2.imread(fn, 0).astype(np.float32), t=t), (0, 0), 0.7)
  res[st] = {}
  for nm in ("eyeR", "eyeL"):
    cx, cy, rx, ry = G[nm]["ring"]
    if RIG[st]:
      (ox, oy), rot, (dx, dy) = RIG[st]; c, s = np.cos(rot), np.sin(rot); ex, ey = cx - ox, cy - oy
      cx, cy = ox + dx + ex * c - ey * s, oy + dy + ex * s + ey * c
    samp = []
    for k in range(360):
      a = np.radians(k); rr = np.arange(0.75, 1.3, 0.005)
      xs = cx + np.cos(a) * rx * rr; ys = cy + np.sin(a) * ry * rr
      v = np.array([b[int(round(y)), int(round(x))] for x, y in zip(xs, ys)])
      dark = v < 110
      if not dark.any(): samp.append(None); continue
      j = np.where(dark)[0][-1]; i = j
      while i > 0 and dark[i - 1]: i -= 1
      inside = v[max(0, i - 12):i]
      if len(inside) == 0 or inside.max() < 170: samp.append(None); continue
      # width of the ink core (< 70) inside the run, at least 1.5 px
      core = (v[i:j + 1] < 70).sum() * 0.005 * (rx + ry) / 2
      rm = (rr[i] + rr[j]) / 2
      samp.append([cx + np.cos(a) * rx * rm, cy + np.sin(a) * ry * rm, max(1.5, core + 1.0)])
    # contiguous runs (gaps <= 6 degrees bridged), smoothed
    ok = [p is not None for p in samp]
    start = next((k for k in range(360) if not ok[k] and ok[(k + 1) % 360]), 0)
    runs, cur, gap = [], [], 0
    for q in range(1, 361):
      k = (start + q) % 360
      if ok[k]: cur.append(samp[k]); gap = 0
      else:
        gap += 1
        if gap > 6 and cur: runs.append(cur); cur = []
    if cur: runs.append(cur)
    outr = []
    for R in runs:
      if len(R) < 12: continue
      A = np.array(R); S = A.copy()
      for c in range(3): S[:, c] = np.convolve(np.pad(A[:, c], 4, mode="edge"), np.ones(9) / 9, "valid")
      outr.append([[round(float(x), 1), round(float(y), 1), round(float(w), 1)] for x, y, w in S[::4]])
    res[st][nm] = outr
    print(st, nm, [len(r) for r in outr])
hdr = """// The black ring round each eye of the s12 hero (stare = source frame 850, glare = 880) as measured centre-lines:
// runs of [x, y, width] (frame px of that drawing), written by trace/trace_rings.py (control points only). hero.js
// inks them over the traced soft levels so each ring reads as one clean line, as in the source.
export const RINGS = """
open(out, "w").write(hdr + json.dumps(res, separators=(",", ":")) + ";\n")
