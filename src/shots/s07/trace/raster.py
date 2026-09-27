# Shared rasterisers mirrored exactly by src/shots/s07/tracekit.js (zone fill) and closely (strokes, 4x supersampled).
import numpy as np, cv2
def fill_poly_ids(ids, pts, zid):
  """Even-odd scanline fill, pixel centres. pts: Nx2 float (frame px). Writes zid into ids (H x W int32)."""
  H, W = ids.shape
  xs = pts[:, 0]; ys = pts[:, 1]; n = len(pts)
  y0 = max(0, int(np.floor(ys.min()))); y1 = min(H - 1, int(np.ceil(ys.max())))
  xa = xs; ya = ys; xb = np.roll(xs, -1); yb = np.roll(ys, -1)
  for y in range(y0, y1 + 1):
    yc = y + 0.5
    m = ((ya <= yc) & (yb > yc)) | ((yb <= yc) & (ya > yc))
    if not m.any(): continue
    xi = np.sort(xa[m] + (yc - ya[m]) * (xb[m] - xa[m]) / (yb[m] - ya[m]))
    for k in range(0, len(xi) - 1, 2):
      a = int(np.ceil(xi[k] - 0.5)); b = int(np.floor(xi[k + 1] - 0.5))
      a = max(a, 0); b = min(b, W - 1)
      if b >= a: ids[y, a:b + 1] = zid
def propagate(ids, it=8):
  """fill unassigned (-1) pixels from their 4-neighbours (left, right, up, down order), a few passes"""
  for _ in range(it):
    m = ids < 0
    if not m.any(): break
    for dy, dx in ((0, -1), (0, 1), (-1, 0), (1, 0)):
      sh = np.full_like(ids, -1)
      ys = slice(max(0, dy), ids.shape[0] + min(0, dy)); yd = slice(max(0, -dy), ids.shape[0] + min(0, -dy))
      xs = slice(max(0, dx), ids.shape[1] + min(0, dx)); xd = slice(max(0, -dx), ids.shape[1] + min(0, -dx))
      sh[yd, xd] = ids[ys, xs]
      take = (ids < 0) & (sh >= 0); ids[take] = sh[take]
  return ids
def zone_field(ids, zones, H, W):
  """zones: list of dict(mx,my,c=[6]) ; field value 0..255"""
  yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
  out = np.zeros((H, W), np.float32)
  C = np.array([z['c'] for z in zones], np.float32); MX = np.array([z['mx'] for z in zones], np.float32); MY = np.array([z['my'] for z in zones], np.float32)
  I = np.clip(ids, 0, len(zones) - 1)
  x = (xx - MX[I]) / 100; y = (yy - MY[I]) / 100; c = C[I]
  out = c[..., 0] + c[..., 1] * x + c[..., 2] * y + c[..., 3] * x * x + c[..., 4] * x * y + c[..., 5] * y * y
  return out
def draw_strokes(canvas, strokes, S, taper=0.6):
  """canvas: (H*S, W*S) float32 painted in place; strokes: [[x,y,w,v],...] v 0..1"""
  for s in strokes:
    n = len(s)
    for i in range(n - 1):
      x0, y0, w0, v0 = s[i][:4]; x1, y1, w1, v1 = s[i + 1][:4]
      if i == 0: w0 *= taper
      if i == n - 2: w1 *= taper
      w = max(1, int(round((w0 + w1) / 2 * S))); v = float((v0 + v1) / 2 * 255)
      p0 = (int(round(x0 * S)), int(round(y0 * S))); p1 = (int(round(x1 * S)), int(round(y1 * S)))
      cv2.line(canvas, p0, p1, v, w, cv2.LINE_8)
      cv2.circle(canvas, p1, w // 2, v, -1, cv2.LINE_8)
    if n >= 2:
      x0, y0, w0, v0 = s[0][:4]; w = max(1, int(round(w0 * taper * S)))
      cv2.circle(canvas, (int(round(x0 * S)), int(round(y0 * S))), w // 2, float(v0 * 255), -1, cv2.LINE_8)
def render_strokes_over(base, strokes, S=4):
  H, W = base.shape
  c = cv2.resize(base, (W * S, H * S), interpolation=cv2.INTER_LINEAR)
  draw_strokes(c, strokes, S)
  return cv2.resize(c, (W, H), interpolation=cv2.INTER_AREA)
def gblur(x, s):
  return cv2.GaussianBlur(x, (0, 0), s) if s > 0 else x
def ink_shapes(g, thr, polarity, min_area=20, eps=0.7, blur=0.8, max_area=1e12, mask=None):
  """Solid ink shapes: regions of the lightly blurred value below thr ('d') or above thr ('b') (or a given mask).
  Returns [{'v': value 0..1, 'rings': [ring, ...]}] ; rings[0] outer, the rest holes (even-odd)."""
  gs = gblur(g, blur)
  m = mask if mask is not None else ((gs < thr) if polarity == 'd' else (gs > thr))
  m = m.astype(np.uint8)
  cs, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
  out = []
  if hier is None: return out
  hier = hier[0]
  for i, c in enumerate(cs):
    if hier[i][3] != -1: continue           # holes handled with their parent
    ca = cv2.contourArea(c)
    if ca < min_area or ca > max_area: continue
    rings = [c]
    j = hier[i][2]
    while j != -1:
      if cv2.contourArea(cs[j]) >= 4: rings.append(cs[j])
      j = hier[j][0]
    mm = np.zeros(m.shape, np.uint8); cv2.drawContours(mm, rings, -1, 1, -1)   # approx value from the filled region
    for h in rings[1:]: cv2.drawContours(mm, [h], -1, 0, -1)
    v = float(np.median(g[mm > 0])) / 255 if mm.any() else 0.0
    R = []
    for r in rings:
      a = cv2.approxPolyDP(r, eps, True)[:, 0, :].astype(np.float32) + 0.5
      if len(a) >= 3: R.append([[round(float(x), 1), round(float(y), 1)] for x, y in a])
    if R: out.append({"v": round(v, 3), "rings": R})
  return out
def draw_shapes(canvas, shapes, S):
  H, W = canvas.shape
  for sh in shapes:
    m = np.zeros((H, W), np.uint8)
    pts = [np.round(np.array(r) * S).astype(np.int32) for r in sh["rings"]]
    cv2.fillPoly(m, pts[:1], 1)
    for p in pts[1:]: cv2.fillPoly(m, [p], 0)
    canvas[m > 0] = sh["v"] * 255
def render_shapes_over(base, shapes, S=4):
  H, W = base.shape
  c = cv2.resize(base, (W * S, H * S), interpolation=cv2.INTER_LINEAR)
  draw_shapes(c, shapes, S)
  return cv2.resize(c, (W, H), interpolation=cv2.INTER_AREA)

def shape_mask(shapes, H, W, S=1):
  """coverage 0..1 (H x W) of the shapes (even-odd), rasterised at S x then area-averaged"""
  m = np.zeros((H * S, W * S), np.uint8)
  for sh in shapes:
    mm = np.zeros_like(m)
    pts = [np.round(np.array(r) * S - (0.5 if S == 1 else 0)).astype(np.int32) for r in sh["rings"]]
    cv2.fillPoly(mm, pts[:1], 1)
    for p in pts[1:]: cv2.fillPoly(mm, [p], 0)
    m |= mm
  if S == 1: return m.astype(np.float32)
  return cv2.resize(m.astype(np.float32), (W, H), interpolation=cv2.INTER_AREA)
def fit_zone_coeffs(ids, nz, target, sel, fallback=None, mind=30):
  """quadratic per zone fitted to target at pixels sel (bool); zones with too few selected pixels get
  fallback coeffs (or the constant mean of target over sel)"""
  H, W = ids.shape
  yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
  order = np.argsort(ids.ravel(), kind="stable"); ls = ids.ravel()[order]; bnd = np.searchsorted(ls, np.arange(nz + 1))
  X = xx.ravel(); Y = yy.ravel(); B = target.ravel(); SL = sel.ravel()
  gm = float(B[SL].mean()) if SL.any() else float(B.mean())
  out = []
  for k in range(nz):
    ii = order[bnd[k]:bnd[k + 1]]
    jj = ii[SL[ii]] if len(ii) else ii
    if len(ii) == 0: out.append([gm, 0, 0, 0, 0, 0]); continue
    mx, my = float(X[ii].mean()), float(Y[ii].mean())
    if len(jj) < mind:
      out.append(list(fallback[k]) if fallback is not None else [float(B[jj].mean()) if len(jj) else gm, 0, 0, 0, 0, 0]); continue
    x = (X[jj] - mx) / 100; y = (Y[jj] - my) / 100
    cols = [np.ones_like(x), x, y, x * x, x * y, y * y]
    d = 6 if len(jj) > 400 else (3 if len(jj) > 60 else 1)
    A = np.stack(cols[:d], 1); cc, *_ = np.linalg.lstsq(A, B[jj], rcond=None)
    out.append([float(v) for v in cc] + [0.0] * (6 - d))
  return out
def box3(F, r=3):
  """mirror of tracekit.js box3: three box passes of width 2r+1 per axis, edges clamped"""
  F = F.astype(np.float32).copy()
  for _ in range(3):
    F = cv2.blur(F, (2 * r + 1, 1), borderType=cv2.BORDER_REPLICATE)
    F = cv2.blur(F, (1, 2 * r + 1), borderType=cv2.BORDER_REPLICATE)
  return F
def zone_ids_from(zones, H, W):
  ids = np.full((H, W), -1, np.int32)
  for k, z in enumerate(zones): fill_poly_ids(ids, np.array(z["p"], np.float32), k)
  return propagate(ids)

def key_caps(g, poly, core=30, grow=1.5, r=2.5):
  """Keyboard keys: dark cores (value < core) inside poly whose hull is a clean quadrilateral; each fitted by 4 corners,
  grown by `grow` px and drawn with corners rounded by r. Returns (shapes, mask of the grown quads)."""
  H, W = g.shape
  km = np.zeros((H, W), np.uint8); cv2.fillPoly(km, [np.array(poly, np.int32)], 1)
  gs = gblur(g, 0.8)
  cm = ((gs < core) & (km > 0)).astype(np.uint8)
  n, lab, st, _ = cv2.connectedComponentsWithStats(cm)
  shapes = []; qm = np.zeros((H, W), np.uint8)
  for i in range(1, n):
    a = st[i, 4]
    if a < 60 or a > 3000: continue
    cs, _ = cv2.findContours((lab == i).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    hull = cv2.convexHull(cs[0]); ha = cv2.contourArea(hull)
    if ha <= 0 or a / ha < 0.88: continue
    q = cv2.approxPolyDP(hull, 0.04 * cv2.arcLength(hull, True), True)[:, 0, :].astype(np.float32)
    if len(q) != 4: continue
    # corner angles must be quad-like (no slivers)
    ok = True
    for k in range(4):
      u = q[k - 1] - q[k]; v = q[(k + 1) % 4] - q[k]
      c = np.dot(u, v) / (np.linalg.norm(u) * np.linalg.norm(v) + 1e-6)
      if abs(c) > 0.88: ok = False
    if not ok: continue
    c0 = q.mean(0) + 0.5
    qq = []
    for k in range(4):       # grow along the bisector
      p = q[k] + 0.5; d = p - c0; qq.append(p + d / (np.linalg.norm(d) + 1e-6) * grow * 1.41)
    qq = np.array(qq)
    ring = []
    for k in range(4):       # rounded corners
      p = qq[k]; a_ = qq[k - 1]; b_ = qq[(k + 1) % 4]
      u = (a_ - p) / (np.linalg.norm(a_ - p) + 1e-6); v = (b_ - p) / (np.linalg.norm(b_ - p) + 1e-6)
      rr = min(r, 0.3 * np.linalg.norm(a_ - p), 0.3 * np.linalg.norm(b_ - p))
      s0 = p + u * rr; s1 = p + v * rr
      for t in np.linspace(0, 1, 5):
        pt = (1 - t) ** 2 * s0 + 2 * (1 - t) * t * p + t * t * s1; ring.append([round(float(pt[0]), 1), round(float(pt[1]), 1)])
    v = float(np.mean(g[lab == i])) / 255
    shapes.append({"v": round(v, 3), "rings": [ring]})
    cv2.fillPoly(qm, [np.round(np.array(ring) - 0.5).astype(np.int32)], 1)
  # key legends: the small bright glyph marks inside the caps
  inner = cv2.erode(qm, np.ones((3, 3), np.uint8))
  lm = (((g - gblur(g, 1.5)) > 8) & (g > 30) & (inner > 0)).astype(np.uint8)
  n2, lab2, st2, _ = cv2.connectedComponentsWithStats(lm)
  for i in range(1, n2):
    if st2[i, 4] < 2 or st2[i, 4] > 60: continue
    cm = (lab2 == i).astype(np.uint8)
    v = float(np.mean(g[cm > 0])) / 255
    cs, _ = cv2.findContours(cm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = cv2.approxPolyDP(cs[0], 0.4, True)[:, 0, :].astype(np.float32) + 0.5
    if len(c) < 3:
      x, y, w, h = st2[i, :4]; c = np.array([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], np.float32)
    shapes.append({"v": round(v, 3), "rings": [[[round(float(a), 1), round(float(b), 1)] for a, b in c]]})
  return shapes, qm
def _hash(x, y, salt):
  h = (x * np.uint32(374761393) + y * np.uint32(668265263) + np.uint32(salt)) & np.uint32(0xFFFFFFFF)
  h = ((h ^ (h >> np.uint32(13))) * np.uint32(1274126177)) & np.uint32(0xFFFFFFFF)
  return ((h ^ (h >> np.uint32(16))) & np.uint32(0xFFFF)).astype(np.float32) / 65535.0
def _vnoise(xx, yy, cell, salt):
  gx = xx / cell; gy = yy / cell; ix = np.floor(gx); iy = np.floor(gy); fx = gx - ix; fy = gy - iy
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
  I = ix.astype(np.int64).astype(np.uint32); J = iy.astype(np.int64).astype(np.uint32)
  a = _hash(I, J, salt); b = _hash(I + np.uint32(1), J, salt); c = _hash(I, J + np.uint32(1), salt); d = _hash(I + np.uint32(1), J + np.uint32(1), salt)
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
def mesh_pattern(H, W, x0=0, y0=0):
  """mirror of tracekit.js meshField(): the print mesh - fine lines rising to the right (period 3.4 px) whose phase
  and strength wander in 16 px patches, plus half-strength softened grain; unit rms"""
  yy, xx = np.mgrid[0:H, 0:W].astype(np.float32); xx += x0; yy += y0
  ph = _vnoise(xx, yy, 16.0, 7) * 6.2832
  am = 0.3 + 0.7 * _vnoise(xx, yy, 12.0, 11)
  st = np.sin((xx + yy) * (6.2832 / (3.4 * 1.41421)) + ph) * am
  gr = grain_pattern(H, W, x0, y0)
  m = st / 0.46 + 0.5 * gr
  return m / 1.118
def grain_pattern(H, W, x0=0, y0=0):
  """mirror of tracekit.js grain(): per-pixel integer hash noise (frame coords), 3x3 box-softened, unit rms"""
  yy, xx = np.mgrid[0:H, 0:W].astype(np.uint32)
  x = xx + np.uint32(x0); y = yy + np.uint32(y0)
  h = (x * np.uint32(374761393) + y * np.uint32(668265263)) & np.uint32(0xFFFFFFFF)
  h = ((h ^ (h >> np.uint32(13))) * np.uint32(1274126177)) & np.uint32(0xFFFFFFFF)
  h = h ^ (h >> np.uint32(16))
  n = (h & np.uint32(0xFFFF)).astype(np.float32) / 65535.0 - 0.5
  n = cv2.blur(n, (3, 3), borderType=cv2.BORDER_REPLICATE)
  return n / 0.0962   # rms of the softened noise -> 1

def knit_cells(g, polys, delta=5.0, min_area=4, eps=0.5, grow=1):
  """Bright knit cells on a dark ground inside polys: the components of (g - blur(g, 2.5) > delta), opened 2x2,
  outlines grown by `grow` px (the core is the brightest part of a cell); value = the core's mean.
  Returns (shapes, region mask)."""
  H, W = g.shape
  km = np.zeros((H, W), np.uint8)
  for poly in polys: cv2.fillPoly(km, [np.array(poly, np.int32)], 1)
  d = g - cv2.GaussianBlur(g, (0, 0), 2.5)
  m = ((d > delta) & (km > 0)).astype(np.uint8)
  m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
  n, lab, st, _ = cv2.connectedComponentsWithStats(m)
  shapes = []
  for i in range(1, n):
    if st[i, 4] < min_area: continue
    cm = (lab == i).astype(np.uint8)
    v = float(np.mean(g[cm > 0])) / 255
    if grow: cm = cv2.dilate(cm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1, 2 * grow + 1)))
    cs, _ = cv2.findContours(cm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = cv2.approxPolyDP(cs[0], eps, True)[:, 0, :].astype(np.float32) + 0.5
    if len(c) < 3:
      x, y, w, h = st[i, :4]; c = np.array([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], np.float32)
    shapes.append({"v": round(v, 3), "rings": [[[round(float(a), 1), round(float(b), 1)] for a, b in c]]})
  return shapes, km

def pin_dots(g, polys, delta=7.0, max_area=12):
  """Small dark dots (the plaster's perforations) inside polys: pixels darker than their 2 px surround by delta,
  on a light ground, away from the ink outlines; each dot a tiny square-ish shape with its own value."""
  H, W = g.shape
  km = np.zeros((H, W), np.uint8)
  for poly in polys: cv2.fillPoly(km, [np.array(poly, np.int32)], 1)
  d = g - cv2.GaussianBlur(g, (0, 0), 2.0)
  ink = cv2.dilate((g < 130).astype(np.uint8), np.ones((5, 5), np.uint8))
  m = ((d < -delta) & (g > 140) & (km > 0) & (ink == 0)).astype(np.uint8)
  n, lab, st, cen = cv2.connectedComponentsWithStats(m)
  out = []
  for i in range(1, n):
    if st[i, 4] > max_area: continue
    x, y, w, h = st[i, :4]; v = float(np.min(g[lab == i])) / 255
    r = 0.5
    out.append({"v": round(v, 3), "rings": [[[x - r + 0.5, y - r + 0.5], [x + w + r - 0.5, y - r + 0.5], [x + w + r - 0.5, y + h + r - 0.5], [x - r + 0.5, y + h + r - 0.5]]]})
  return out
