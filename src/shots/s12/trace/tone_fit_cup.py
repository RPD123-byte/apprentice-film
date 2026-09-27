#!/usr/bin/env python3
# tone_fit_cup.py raw_render.png src850.png ../hpx.js N [sigma]
# Second round of the cup metal's base tone (fix pass 2): the blurred (sigma 4) difference source - render, both in
# PRE-finish values (the source through degrade.py, the render's raw layer before post.js), inside the metal polygon
# minus the halftone parts, is fitted by N more round Gaussians (sigma 6 / 12 / 24) and APPENDED to HPX_BASE in
# ../hpx.js. Control points only.
import cv2, numpy as np, json, re, sys
from degrade import degrade
raw, src, js, N = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
SG = float(sys.argv[5]) if len(sys.argv) > 5 else 4.0
r = cv2.imread(raw, 0).astype(np.float32); s = degrade(cv2.imread(src, 0).astype(np.float32)); H, W = s.shape
txt = open(js).read()
get = lambda k: json.loads(re.search(r'export const %s = (.*?);\n' % k, txt, re.S).group(1))
MET, ARM, CRES, STRIP = get('HPX_MET'), get('HPX_ARM'), get('HPX_CRES'), get('HPX_STRIP'); c0, blobs = get('HPX_BASE')
M = np.zeros((H, W), np.uint8); cv2.fillPoly(M, [np.array(MET, np.int32)], 1)
for P in (ARM, CRES, STRIP): cv2.fillPoly(M, [np.array(P, np.int32)], 0)
cv2.ellipse(M, (1380, 278), (46, 82), 0, 0, 360, 0, -1)
M = cv2.erode(M, np.ones((5, 5), np.uint8))
D = (cv2.GaussianBlur(s, (0, 0), SG) - cv2.GaussianBlur(r, (0, 0), SG)) / 255.0
ys, xs = np.nonzero(M); x0, y0, x1, y1 = xs.min() - 30, ys.min() - 30, xs.max() + 30, ys.max() + 30
yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32); msk = M[y0:y1, x0:x1].astype(np.float32)
R = D[y0:y1, x0:x1] * msk; before = np.abs(R[msk > 0]).mean()
new = []
for it in range(N):
  best = None
  for sg in (6.0, 12.0, 24.0):
    num = cv2.GaussianBlur(R * msk, (0, 0), sg); den = cv2.GaussianBlur(msk, (0, 0), sg / np.sqrt(2)) + 1e-6
    sc = num * num / den * cv2.erode(msk, np.ones((5, 5), np.uint8))
    j = np.unravel_index(np.argmax(sc), sc.shape)
    if best is None or sc[j] * sg > best[0]: best = (sc[j] * sg, sg, j)
  _, sg, (jy, jx) = best
  G = np.exp(-((xx - (x0 + jx)) ** 2 + (yy - (y0 + jy)) ** 2) / (2 * sg * sg)) * msk
  a = float(np.clip((R * G).sum() / ((G * G).sum() + 1e-9), -0.5, 0.5))
  R -= a * G; new.append([int(x0 + jx), int(y0 + jy), sg, round(a, 3)])
print('residual MAE %.4f -> %.4f with %d blobs' % (before, np.abs(R[msk > 0]).mean(), N))
txt = re.sub(r'export const HPX_BASE = .*?;\n', 'export const HPX_BASE = %s;\n' % json.dumps([c0, blobs + new]), txt, count=1, flags=re.S)
open(js, 'w').write(txt)
