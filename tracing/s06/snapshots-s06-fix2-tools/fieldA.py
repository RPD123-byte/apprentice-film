#!/usr/bin/env python3
# fix pass 2, defect 1: the hair above the left brow's inner end slides up along its strands with the smile.
# DIS flow on the source means (held smile 712-725 -> neutral 668-677): S(p) = N(p + fl(p)); smoothed (sigma 1.5),
# faded to 0 outside the patch polygon (feathered 3 px), sampled on a 4 px grid over ZB. Prints the JS constant
# (D = -fl, the drawZone convention out(p) = src(p - s D)). Measurement only.
import json, sys
from util import *
S = smean(712, 725); N = smean(668, 677)
x0, y0, x1, y1 = 730, 140, 890, 280
a = np.clip(N[y0:y1, x0:x1], 0, 255).astype(np.uint8); b = np.clip(S[y0:y1, x0:x1], 0, 255).astype(np.uint8)
dis = cv2.DISOpticalFlow_create(2)
dis.setFinestScale(0); dis.setPatchSize(8); dis.setPatchStride(2); dis.setGradientDescentIterations(40)
fl = dis.calc(b, a, None)
SIG = float(sys.argv[1]) if len(sys.argv) > 1 else 1.5
fl = cv2.GaussianBlur(fl, (0, 0), SIG)
P = [(806,178),(800,188),(794,197),(788,205),(782,212),(776,220),(771,228),(767,236),(765,243),(784,243),(792,233),(798,223),(804,213),(810,203),(816,193),(821,183),(818,175)]
m = np.zeros((946, 2206), np.float32); cv2.fillPoly(m, [np.array(P, np.int32)], 1.0)
m = cv2.GaussianBlur(cv2.dilate(m, np.ones((5, 5), np.uint8)), (0, 0), 3)[y0:y1, x0:x1]
fl *= m[..., None]
ZB = [760, 168, 832, 252]; st = 4; nx = (ZB[2] - ZB[0]) // st + 1; ny = (ZB[3] - ZB[1]) // st + 1
d = []
for j in range(ny):
    for i in range(nx):
        x, y = ZB[0] + i * st, ZB[1] + j * st
        d += [round(-float(fl[y - y0, x - x0, 0]), 2), round(-float(fl[y - y0, x - x0, 1]), 2)]
# check: the warp of N by fl vs S inside P
h, w = a.shape; gx, gy = np.meshgrid(np.arange(w), np.arange(h))
wN = cv2.remap(N[y0:y1, x0:x1], (gx + fl[..., 0]).astype(np.float32), (gy + fl[..., 1]).astype(np.float32), cv2.INTER_LINEAR)
mm = m > 0.5
e = lambda A: np.abs(cv2.GaussianBlur(A, (0, 0), 1.5) - cv2.GaussianBlur(S[y0:y1, x0:x1], (0, 0), 1.5))[mm].mean()
print('// check: N vs S %.1f, warped N vs S %.1f (sigma 1.5, in P)' % (e(N[y0:y1, x0:x1]), e(wN)), file=sys.stderr)
print('export const ZA = ' + json.dumps({'box': ZB, 'step': st, 'nx': nx, 'ny': ny, 'd': d}, separators=(',', ':')) + ';')
