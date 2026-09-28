#!/usr/bin/env python3
# trace_eyes.py src850.png src880.png src882.png geo.json out.json dbg.png
# The eyes of the s12 hero, measured on the three drawings of the source: stare (frame 850 = 34.0 s), glare (880 =
# 35.20 s) and eyes shut (882 = 35.28 s). Writes CONTROL POINTS only: simplified outlines (outer rings + holes, fill
# even-odd) of two ink levels inside each eye's region —
#   dark: the black of pupil + lid + ring (blur 0.8, < 100)
#   grey: the soft grey feather strokes and lid/socket contours round it (blur 0.8, < GREY), each group with its mean
#         measured value
# The region is the complement of the feather-stroke tracer's eye mask (ring ellipse + 8, lid + 9 px), mapped through
# the pop's head rig for 880/882 (and widened a little for the shut-eye socket contours).
import cv2, numpy as np, json, sys
from degrade import degrade
s850, s880, s882, geo, out, dbg = sys.argv[1:7]
G = json.load(open(geo))
RIGS = {"stare": None, "glare": ([1000, 350], -0.0459, [-12.9, 27.6]), "closed": ([1000, 350], -0.0899, [-22.5, 55.6])}
LEVELS = {"stare": [205, 150], "glare": [205, 150], "closed": [216, 185, 140]}   # grey thresholds (light to dark)
GROW = {"stare": 0, "glare": 2, "closed": 8}

def region(H, W, grow):
  m = np.zeros((H, W), np.uint8)
  for e in (G["eyeR"], G["eyeL"]):
    cx, cy, rx, ry = e["ring"]; cv2.ellipse(m, (int(cx), int(cy)), (int(rx + 8 + grow), int(ry + 8 + grow)), 0, 0, 360, 1, -1)
    lm = np.zeros((H, W), np.uint8); cv2.fillPoly(lm, [np.array(e["lid"], np.int32)], 1)
    m |= cv2.dilate(lm, np.ones((2 * (9 + grow) + 1, 2 * (9 + grow) + 1), np.uint8))
    lash = np.zeros((H, W), np.uint8); cv2.polylines(lash, [np.array(e["lash"], np.int32)], False, 1, 2)
    m |= cv2.dilate(lash, np.ones((2 * (6 + grow) + 1, 2 * (6 + grow) + 1), np.uint8))
  return m

def rings_of(mask, eps, mina):
  cs, hi = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
  groups = {}
  if hi is None: return []
  hi = hi[0]
  for i, c in enumerate(cs):
    if abs(cv2.contourArea(c)) < mina: continue
    a = cv2.approxPolyDP(c, eps, True)[:, 0, :]
    if len(a) < 3: continue
    root = i if hi[i][3] < 0 else hi[i][3]
    groups.setdefault(root, []).append((i, [[int(p[0]), int(p[1])] for p in a]))
  return [(root, [r for _, r in v]) for root, v in groups.items()]

BEAK_LEVELS = [224, 195, 150]
BEAK_GROW = {"stare": 5, "glare": 9, "closed": 12}
def beak_region(H, W, grow):
  m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.array(G["beak"]["out"], np.int32)], 1)
  return cv2.dilate(m, np.ones((2 * grow + 1, 2 * grow + 1), np.uint8))
res = {}; dbgs = []
for st, path, tt in (("stare", s850, 34.0), ("glare", s880, 35.2), ("closed", s882, 35.28)):
  g0 = degrade(cv2.imread(path, 0).astype(np.float32), t=tt); H, W = g0.shape   # in the layer's pre-finish values
  M = region(H, W, GROW[st])
  if RIGS[st]:
    (cx, cy), rot, (dx, dy) = RIGS[st]; c, s = np.cos(rot), np.sin(rot)
    A = np.array([[c, -s, cx + dx - cx * c + cy * s], [s, c, cy + dy - cx * s - cy * c]], np.float32)
    M = cv2.warpAffine(M, A, (W, H), flags=cv2.INTER_NEAREST)
  b = cv2.GaussianBlur(g0, (0, 0), 0.8)
  dark = (b < 70) & (M > 0)
  D = [r for _, rs in rings_of(dark, 0.6, 4) for r in rs]
  # grey levels (light to dark), each filled with the mean measured value of its band
  Gs = []; prev = 70
  for thr in LEVELS[st][::-1]:
    lv = cv2.morphologyEx(((b < thr) & (M > 0)).astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)) > 0
    band = (b < thr) & (b >= prev) & (M > 0); prev = thr
    v = float(g0[band].mean()) / 255 if band.sum() > 3 else thr / 255
    Gs.insert(0, [round(v, 2), [r for _, rs in rings_of(lv, 0.7, 5) for r in rs]])
  # the eye-white openings are what the ink leaves inside the rings: nothing to store
  # beak: same ink levels plus a light one for its shaded side
  MB = beak_region(H, W, BEAK_GROW[st])
  if RIGS[st]: MB = cv2.warpAffine(MB, A, (W, H), flags=cv2.INTER_NEAREST)
  BD = [r for _, rs in rings_of((b < 70) & (MB > 0), 0.6, 3) for r in rs]
  BG = []; prev = 70
  for thr in BEAK_LEVELS[::-1]:
    lv = cv2.morphologyEx(((b < thr) & (MB > 0)).astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)) > 0
    band = (b < thr) & (b >= prev) & (MB > 0); prev = thr
    v = float(g0[band].mean()) / 255 if band.sum() > 3 else thr / 255
    BG.insert(0, [round(v, 2), [r for _, rs in rings_of(lv, 0.7, 4) for r in rs]])
  res[st + "Beak"] = {"dark": BD, "grey": BG}
  for v, rs in BG: Gs.append([v, rs])
  D = D + BD
  res[st] = {"dark": D, "grey": Gs, "region": [int(x) for x in cv2.boundingRect((M | MB).astype(np.uint8))]}
  # debug redraw
  im = np.full((H, W), 240, np.uint8)
  def eo(rs):
    mm = np.zeros((H, W), np.uint8)
    for r in rs: t = np.zeros((H, W), np.uint8); cv2.fillPoly(t, [np.array(r, np.int32)], 1); mm ^= t
    return mm > 0
  for v, rs in Gs: im[eo(rs)] = int(v * 255)
  im[eo(D)] = 10
  x, y, w, h = res[st]["region"]
  dbgs.append(np.hstack([g0[y:y + h, x:x + w].astype(np.uint8), im[y:y + h, x:x + w]]))
  print(st, len(D), "dark rings", [(v, len(r)) for v, r in Gs], "grey levels", sum(len(r) for r in D) + sum(len(r) for _, rs in Gs for r in rs), "points")
json.dump(res, open(out, "w"))
wmax = max(d.shape[1] for d in dbgs)
cv2.imwrite(dbg, np.vstack([np.pad(d, ((0, 4), (0, wmax - d.shape[1])), constant_values=128) for d in dbgs]))
