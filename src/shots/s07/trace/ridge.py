# Ridge tracer: dark (ink) and bright (white line) centre-lines with width and value per point.
import cv2, numpy as np
from skimage.morphology import skeletonize, remove_small_objects
from skimage.filters import apply_hysteresis_threshold
from skimage.feature import hessian_matrix, hessian_matrix_eigvals
from scipy.spatial import cKDTree

def ridge_map(g, sig, polarity, with_angle=False):
  Hm = hessian_matrix(g, sigma=sig, order='rc', use_gaussian_derivatives=True)
  ev = hessian_matrix_eigvals(Hm)   # ev[0] >= ev[1]
  R = np.maximum(0, ev[0]) * sig * sig if polarity == 'd' else np.maximum(0, -ev[1]) * sig * sig
  if not with_angle: return R
  Hrr, Hrc, Hcc = Hm
  phi = 0.5 * np.arctan2(2 * Hrc, Hcc - Hrr)          # direction of maximum curvature (x, y)
  across = phi if polarity == 'd' else phi + np.pi / 2
  return R, np.mod(across, np.pi)

def skel_paths(m):
  sk = skeletonize(m).astype(np.uint8)
  ys, xs = np.nonzero(sk); pts = set(zip(xs.tolist(), ys.tolist()))
  def nb(p): return [(p[0]+dx, p[1]+dy) for dx in (-1,0,1) for dy in (-1,0,1) if (dx or dy) and (p[0]+dx, p[1]+dy) in pts]
  deg = {p: len(nb(p)) for p in pts}
  used = set(); paths = []
  def walkp(p0, p1):
    path = [p0, p1]; used.add((p0,p1)); used.add((p1,p0))
    while True:
      cur = path[-1]
      if deg[cur] != 2: break
      nx = [q for q in nb(cur) if q != path[-2] and (cur,q) not in used]
      if not nx: break
      q = nx[0]; used.add((cur,q)); used.add((q,cur)); path.append(q)
    return path
  for p in sorted(pts):
    if deg[p] != 2:
      for q in nb(p):
        if (p,q) not in used: paths.append(walkp(p,q))
  for p in sorted(pts):
    for q in nb(p):
      if (p,q) not in used: paths.append(walkp(p,q))
  return [np.array(P, float) for P in paths if len(P) >= 3]

def merge(paths, rad=7.0, align=0.75):
  if not paths: return paths
  def endinfo(P, which):
    if which == 0: p = P[0]; q = P[min(len(P)-1, 5)]
    else: p = P[-1]; q = P[max(0, len(P)-6)]
    t = p - q; return p, t/(np.linalg.norm(t)+1e-9)
  E = []
  for i, P in enumerate(paths):
    for wh in (0,1): p, t = endinfo(P, wh); E.append((i, wh, p, t))
  tree = cKDTree(np.array([e[2] for e in E]))
  cand = []
  for a, b in tree.query_pairs(rad):
    i, wi, pi, ti = E[a]; j, wj, pj, tj = E[b]
    if i == j: continue
    dv = pj - pi; dist = np.linalg.norm(dv)
    if np.dot(ti, -tj) < align: continue
    if dist > 1.5:
      u = dv/dist
      if np.dot(ti, u) + (-np.dot(tj, u)) < 1.3: continue
    cand.append((dist - 3*np.dot(ti, -tj), a, b))
  cand.sort(); link = {}
  for sc, a, b in cand:
    if a in link or b in link: continue
    link[a] = b; link[b] = a
  seen = set(); chains = []
  for start in range(len(E)):
    i, wh = E[start][0], E[start][1]
    if i in seen or start in link: continue
    cur_e = start; parts = []
    while True:
      i, wh = E[cur_e][0], E[cur_e][1]
      if i in seen: break
      seen.add(i)
      P = paths[i] if wh == 0 else paths[i][::-1]
      parts.append(P)
      other = 2*i + (1-wh)
      if other in link: cur_e = link[other]
      else: break
    chains.append(np.vstack(parts))
  for i, P in enumerate(paths):
    if i not in seen: chains.append(P)
  return chains

def rdp(P, eps):
  if len(P) < 3: return list(P)
  a, b = P[0], P[-1]; ab = b - a; L = np.linalg.norm(ab) + 1e-9
  dd = np.abs(ab[0]*(P[1:-1,1]-a[1]) - ab[1]*(P[1:-1,0]-a[0]))/L
  i = int(np.argmax(dd)) + 1
  if dd[i-1] > eps: return rdp(P[:i+1], eps)[:-1] + rdp(P[i:], eps)
  return [a, b]

def trace(g, base, polarity, sig=1.2, hi=6, lo=3, minlen=6, mask=None, eps=0.6, maxw=14, smooth=5, bins=0, wmed=0):
  """g, base: float 0..255. Returns list of strokes [[x,y,w,v,c],...] ; v = absolute value 0..1 at the centre,
  c = contrast against base. bins > 0 skeletonises each orientation band separately (crossing lines of a grid or a
  cross-hatch stay whole instead of breaking at every crossing); wmed > 0 median-filters the widths along a stroke."""
  H, W = g.shape
  R, ANG = ridge_map(g, sig, polarity, with_angle=True)
  D = (base - g) if polarity == 'd' else (g - base)     # contrast of the line against its surround
  R[D < 2] = 0
  if mask is not None: R[~mask] = 0
  m = apply_hysteresis_threshold(R, lo, hi)
  m = remove_small_objects(m, 6)
  dt = cv2.distanceTransform(m.astype(np.uint8), cv2.DIST_L2, 3)
  if bins > 0:
    b = np.floor(ANG / np.pi * bins).astype(int) % bins
    paths = []
    for k in range(bins): paths += skel_paths(m & (b == k))
    paths = merge(paths, rad=5.0, align=0.9)
  else:
    paths = merge(skel_paths(m))
  res = []
  Dp = np.maximum(0, D)
  for P in paths:
    L = np.sum(np.hypot(*np.diff(P, axis=0).T))
    if L < minlen: continue
    if len(P) > smooth and smooth > 1:
      k = np.ones(smooth)/smooth; A = P.copy(); h = smooth//2
      A[h:-h,0] = np.convolve(P[:,0], k, 'valid'); A[h:-h,1] = np.convolve(P[:,1], k, 'valid'); P = A
    S = np.array(rdp(P, eps))
    row = []
    for k in range(len(S)):
      x, y = S[k]
      t = S[min(len(S)-1, k+1)] - S[max(0, k-1)]; t = t/(np.linalg.norm(t)+1e-9); nrm = np.array([-t[1], t[0]])
      os_ = np.arange(-8, 8.01, 0.5)
      px = np.clip(np.round(x + nrm[0]*os_).astype(int), 0, W-1); py = np.clip(np.round(y + nrm[1]*os_).astype(int), 0, H-1)
      prof = Dp[py, px]; gv = g[py, px]; c = len(prof)//2
      j = c - 3 + int(np.argmax(prof[c-3:c+4])); pk = prof[j]
      lo_ = j
      while lo_ > 0 and prof[lo_-1] > 0.2*pk: lo_ -= 1
      hi_ = j
      while hi_ < len(prof)-1 and prof[hi_+1] > 0.2*pk: hi_ += 1
      I = prof[lo_:hi_+1].sum()*0.5
      w = min(I/max(pk, 1e-3), 2*float(dt[int(round(y)), int(round(x))]) + 1.5, maxw)
      v = gv[j]/255.0
      row.append([round(float(x),2), round(float(y),2), round(max(0.5, float(w)),2), round(float(v),3), round(float(pk),1)])
    if wmed > 0 and len(row) > 2:
      ws = np.array([q[2] for q in row]); h = wmed // 2
      wf = [float(np.median(ws[max(0, i - h):i + h + 1])) for i in range(len(ws))]
      for q, w_ in zip(row, wf): q[2] = round(min(q[2], w_), 2)
    res.append(row)
  return res
