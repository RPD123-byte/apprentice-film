#!/usr/bin/env python3
# beak_tojs.py out.js stare.json src850 glare.json src880 closed.json src882
# Fix pass 2: the beak of each drawing as drawn ink (control points only). Takes the snapped centre-lines of
# trace_snap.py (contour: cere -> left side -> hook tip -> cutting edge; upper / lower: the gape's two edges; mid: the
# lower mandible's inner line) and measures on the same pre-finish frame (degrade.py):
#  - shade: least-squares plane v = a + b x + c y of the beak body's paper (pixels brighter than 150 inside the
#           contour + upper edge, 3 px off every line, nostril excluded) -> drawn as a linear gradient
#  - lens:  plane of the gape's interior (between upper and lower, off the lines) -> linear gradient
#  - low:   mean of the lower-mandible band (between mid and lower)
#  - nostril: dark blob < 110 near the guide point -> ellipse [x, y, rx, ry, angle]
import cv2, numpy as np, json, sys
from degrade import degrade
out = sys.argv[1]; items = [('stare', sys.argv[2], sys.argv[3], 34.0, (904, 478)), ('glare', sys.argv[4], sys.argv[5], 35.2, (897, 509)), ('closed', sys.argv[6], sys.argv[7], 35.28, (891, 541))]
res = {}
for key, jf, sf, t, nos in items:
  L = json.load(open(jf)); pre = degrade(cv2.imread(sf, 0).astype(np.float32), t=t); H, W = pre.shape
  P = {k: np.array(v).reshape(-1, 4) for k, v in L.items()}
  pts = lambda k: P[k][:, :2]
  def poly(Q):
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.round(Q).astype(np.int32)], 1); return m
  lines = np.zeros((H, W), np.uint8)
  for k, q in P.items():
    for i in range(1, len(q)): cv2.line(lines, tuple(np.round(q[i - 1, :2]).astype(int)), tuple(np.round(q[i, :2]).astype(int)), 1, int(max(2, q[i, 2] + 4)))
  # beak body: contour + upper, closed along the top (straight back from the gape corner to the cere)
  body = poly(np.vstack([pts('contour'), pts('upper')]))
  ny = np.zeros((H, W), np.uint8); cv2.circle(ny, nos, 8, 1, -1)
  m = (body > 0) & (lines == 0) & (ny == 0) & (pre > 150)
  ys, xs = np.nonzero(m); A = np.stack([np.ones_like(xs), xs, ys], 1).astype(float); shade = np.linalg.lstsq(A, pre[ys, xs] / 255, rcond=None)[0]
  lens = poly(np.vstack([pts('upper'), pts('lower')[::-1]]))
  ml = (lens > 0) & (lines == 0); ys, xs = np.nonzero(ml)
  if len(xs) > 12:
    A = np.stack([np.ones_like(xs), xs, ys], 1).astype(float); lensp = np.linalg.lstsq(A, pre[ys, xs] / 255, rcond=None)[0]
  else: lensp = np.array([float(np.mean(pre[lens > 0])) / 255, 0, 0])
  low = poly(np.vstack([pts('mid'), pts('lower')[::-1]])); lm = (low > 0) & (lines == 0)
  lowv = float(pre[lm].mean() / 255) if lm.sum() > 5 else float(pre[low > 0].mean() / 255)
  # nostril
  nb = ((pre < 110) & (ny > 0)).astype(np.uint8); cs, _ = cv2.findContours(nb, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
  c = max(cs, key=cv2.contourArea); (ex, ey), (ea, eb), ang = cv2.fitEllipse(c) if len(c) >= 5 else ((nos[0], nos[1]), (8, 5), 0)
  res[key] = {k: [round(v, 2) for v in L[k]] for k in L}
  res[key].update({'shade': [round(float(v), 5) for v in shade], 'lens': [round(float(v), 5) for v in lensp], 'low': round(lowv, 3),
                   'nostril': [round(ex, 1), round(ey, 1), round(ea / 2, 1), round(eb / 2, 1), round(ang, 1)]})
  print(key, 'shade', np.round(shade, 4), 'lens', np.round(lensp, 4), 'low %.2f' % lowv, 'nostril', res[key]['nostril'])
with open(out, 'w') as f:
  f.write('// The s12 hero\'s beak for each drawing (stare = source frame 850, glare 880, closed 882), fix pass 2: drawn ink\n')
  f.write('// instead of traced soft-ink levels. Centre-lines [x, y, width px, core value, ...] snapped by trace/trace_snap.py\n')
  f.write('// onto the source\'s ink from hand guides (trace/guides/beak_*.json); fills measured by trace/beak_tojs.py:\n')
  f.write('// shade / lens = plane [a, b, c] (value = a + b x + c y, pre-finish 0..1), low = the lower mandible band, nostril =\n')
  f.write('// ellipse [x, y, rx, ry, angle deg]. Frame px of that drawing. Control points only.\n')
  f.write('export const BEAKS = ' + json.dumps(res) + ';\n')
