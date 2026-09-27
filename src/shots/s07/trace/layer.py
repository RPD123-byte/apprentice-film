# Trace one layer (an image region) into value zones + broad shading strokes + fine ink strokes. Shared by plate.py
# and hands.py. g: float32 grey 0..255 (pre-grade). Returns dict in LOCAL px (add the box origin for frame px) and the
# python mirror render of what tracekit.js paints.
import cv2, numpy as np, time
from ridge import trace
from raster import fill_poly_ids, propagate, zone_field, render_strokes_over, render_shapes_over, ink_shapes, key_caps, knit_cells, pin_dots, gblur
from skimage.segmentation import slic
ZB, BS = 3.0, 3.0
def zones_of(sf, nz, compact=10, mask=None):
  H, W = sf.shape
  lab = slic(np.dstack([sf / 255] * 3), n_segments=nz, compactness=compact, sigma=0, start_label=0, channel_axis=-1)
  n = lab.max() + 1
  polys = []
  for i in range(n):
    m = (lab == i).astype(np.uint8)
    area = int(m.sum())
    if area == 0: continue
    m = cv2.dilate(m, np.ones((3, 3), np.uint8))
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)
    c = cv2.approxPolyDP(c, 1.0, True)[:, 0, :].astype(np.float32) + 0.5
    if len(c) < 3: continue
    polys.append((area, i, c))
  polys.sort(key=lambda p: -p[0])
  ids = np.full((H, W), -1, np.int32)
  for k, (area, i, c) in enumerate(polys): fill_poly_ids(ids, c, k)
  ids = propagate(ids)
  yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
  zones = []
  order = np.argsort(ids.ravel(), kind="stable"); ls = ids.ravel()[order]; bnd = np.searchsorted(ls, np.arange(len(polys) + 1))
  X = xx.ravel(); Y = yy.ravel(); B = sf.ravel()
  for k, (area, i, c) in enumerate(polys):
    ii = order[bnd[k]:bnd[k + 1]]
    if len(ii) == 0: ii = np.array([0])
    mx, my = float(X[ii].mean()), float(Y[ii].mean())
    x = (X[ii] - mx) / 100; y = (Y[ii] - my) / 100
    cols = [np.ones_like(x), x, y, x * x, x * y, y * y]
    d = 6 if len(ii) > 400 else (3 if len(ii) > 30 else 1)
    A = np.stack(cols[:d], 1); cc, *_ = np.linalg.lstsq(A, B[ii], rcond=None)
    cc = list(cc) + [0.0] * (6 - d)
    zones.append({"mx": round(mx, 1), "my": round(my, 1), "c": [round(float(v), 3) for v in cc], "p": [[round(float(a), 1), round(float(b), 1)] for a, b in c]})
  return zones, ids
import os as _os
SHAPE_D, SHAPE_B = float(_os.environ.get("S07_SD", 45)), float(_os.environ.get("S07_SB", 225))
NOISE_L, NOISE_C, NOISE_V0, NOISE_V1 = 30, 26, 0.25, 0.74
def trace_layer(g, nz, fine_hi=5, fine_lo=2.5, log=print, keys=None, cells=None, broad=True, dots=None):
  t0 = time.time()
  H, W = g.shape
  sf = gblur(cv2.medianBlur(np.clip(g, 0, 255).astype(np.uint8), 11).astype(np.float32), 2)
  if keys is not None:
    # the keyboard's base is the silver deck seen in the gaps (local max), the key caps are drawn over it
    km = np.zeros((H, W), np.uint8); cv2.fillPoly(km, [np.array(keys, np.int32)], 1)
    hand = cv2.dilate((gblur(g, 2) > 170).astype(np.uint8), np.ones((9, 9), np.uint8))
    env = gblur(cv2.dilate(g, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))), 2)
    sel = (km > 0) & (hand == 0)
    sf = np.where(sel, env, sf).astype(np.float32)
  if cells is not None:
    # knit: the ground between the bright cells is the dark envelope (local min); the cells are drawn over it
    cm0 = np.zeros((H, W), np.uint8)
    for poly in cells: cv2.fillPoly(cm0, [np.array(poly, np.int32)], 1)
    envd = gblur(cv2.erode(g, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))), 1.5)
    sf = np.where(cm0 > 0, envd, sf).astype(np.float32)
  zones, ids = zones_of(sf, nz)
  Z = zone_field(ids, zones, H, W); Zb = gblur(Z, ZB)
  if broad:
    bd = trace(sf, Zb, "d", sig=4, hi=4, lo=2, minlen=12, eps=1.5, maxw=40, smooth=9)
    bb = trace(sf, Zb, "b", sig=4, hi=4, lo=2, minlen=12, eps=1.5, maxw=40, smooth=9)
  else: bd = bb = []
  R1 = gblur(render_strokes_over(Z, bb + bd), BS)
  # solid ink: black shapes and white shapes (even-odd rings), crisp, over the blurred tone
  if keys is not None:
    # keyboard: clean key caps where the source's key is a whole quad; the melted dark blobs around them removed
    kc, qm = key_caps(g, keys)
    dm = (gblur(g, 0.8) < SHAPE_D).astype(np.uint8)
    km = np.zeros_like(dm); cv2.fillPoly(km, [np.array(keys, np.int32)], 1)
    grown = cv2.dilate(qm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    dm[(km > 0) & (grown > 0)] = 0
    sh = ink_shapes(g, SHAPE_D, "d", mask=dm) + kc + ink_shapes(g, SHAPE_B, "b")
    log("key caps %d" % len(kc))
  elif False:
    pass
  else:
    sh = ink_shapes(g, SHAPE_D, "d") + ink_shapes(g, SHAPE_B, "b")
  bmask = None
  if cells is not None:
    kn, cmask = knit_cells(g, cells)
    sh = sh + kn; bmask = cmask == 0
    log("knit cells %d" % len(kn))
  if dots is not None:
    pd = pin_dots(g, dots); sh = sh + pd
    log("dots %d" % len(pd))
  R1 = render_shapes_over(R1, sh)
  dmask = None
  if keys is not None:   # no dark ink rings round the fitted key caps (the cap edge is already crisp)
    dmask = cv2.dilate(qm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))) == 0
  dk = trace(g, R1, "d", sig=1.2, hi=fine_hi, lo=fine_lo, mask=dmask)
  bk = trace(g, R1, "b", sig=1.2, hi=fine_hi, lo=fine_lo, mask=bmask)
  # drop texture noise: short, faint ridges (the source's print mesh and boil), the value correction keeps the tone
  # (only in the mid-tones, cloth and wood: on the bright owl and skin the short faint strokes are feather flicks
  # and tendons, kept)
  def keep(st):
    L = sum(np.hypot(st[i + 1][0] - st[i][0], st[i + 1][1] - st[i][1]) for i in range(len(st) - 1))
    c = np.mean([q[4] for q in st])
    m = st[len(st) // 2]; bv = R1[min(H - 1, int(m[1])), min(W - 1, int(m[0]))] / 255
    return not (L < NOISE_L and c < NOISE_C and NOISE_V0 < bv < NOISE_V1)
  nd, nb = len(dk), len(bk)
  dk = [st for st in dk if keep(st)]; bk = [st for st in bk if keep(st)]
  log("noise strokes dropped: %d dark, %d white" % (nd - len(dk), nb - len(bk)))
  R2 = render_strokes_over(R1, bk + dk)
  mae = lambda A, s=8: np.abs(gblur(A, s) - gblur(g, s)).mean()
  log("shapes %d (%d ring pts)" % (len(sh), sum(len(r) for q in sh for r in q["rings"])))
  log("layer %dx%d zones %d broad %d fine %d (%d pts) mae8 %.2f mae2 %.2f  %.0fs" % (W, H, len(zones), len(bd) + len(bb), len(dk) + len(bk), sum(len(s) for s in dk + bk), mae(R2), mae(R2, 2), time.time() - t0))
  return {"zones": zones, "broad": bb + bd, "shapes": sh, "fine": bk + dk, "blur": BS}, R2
def offset(L, x0, y0):
  for z in L["zones"]:
    z["mx"] += x0; z["my"] += y0; z["p"] = [[a + x0, b + y0] for a, b in z["p"]]
  for q in L.get("shapes", []): q["rings"] = [[[a + x0, b + y0] for a, b in r] for r in q["rings"]]
  for k in ("broad", "fine"):
    L[k] = [[[q[0] + x0, q[1] + y0] + list(q[2:]) for q in s] for s in L[k]]
  return L
