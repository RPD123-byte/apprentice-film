#!/usr/bin/env python3
# Shot A owl as ink drawings (measurement only; nothing here is loaded by the film).
# Inputs (scratch): owlphase3.npz - per wing phase the median of the standing frames 1341-1381 registered on PATH_A
# and its silhouette (crop origin X0, Y0 = 360, 60 at the frame-1356 placement); owlstack.npz - every frame 1331-1381
# registered the same way (P<n> pre-grade, D<n> = |frame - owl-free plate|, blurred 1.5).
# Output: pickle {'phase': {level, up, down: drawing}, 'feet': {n: drawing}} in frame px at the 1356 placement.
#   phase - the rigid head / body / wing drawing of each wing phase (the source moves one drawing per phase)
#   feet  - per frame, the legs and feet: what that frame's own silhouette adds under the body
import sys, os, pickle, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from inktrace import *
from trace_plate2 import trace_image, shift
X0, Y0 = 360, 60
PH = np.load(sys.argv[1]); ST = np.load(sys.argv[2]); out = sys.argv[3]
prm = dict(T=0.45, rc=1.5, ro=1.5, sm=1.0, nms=1, sigd='0.8,1.3,2.0', sigb='0.8,1.3,2.0', HId=5, LOd=2, minlen=4, HIb=12, LOb=5,
           blobs=30, blobA=1500, blobsig='5,8,12,20', rim=1, minA=30, holeA=20, specks=1, spthr=0.25, spmax=40, dots=0)
for a in sys.argv[4:]:
    k, v = a.split('='); prm[k] = v if k in ('sigd', 'sigb', 'blobsig') else float(v)
cf = lambda f: f - (f - 1) // 25
ph = lambda f: ['level', 'up', 'level', 'down'][cf(f) % 4]
res = {'phase': {}, 'feet': {}}
sils = {}
for p in ['level', 'up', 'down']:
    P = PH[p + '_P'].astype(np.float32); sil = (PH[p + '_sil'] > 0).astype(np.uint8); sils[p] = sil
    dv = float(np.median(P[(sil > 0) & (P < 0.2)]))
    D = trace_image(P, dict(prm, basev=dv), allowed=sil)
    res['phase'][p] = shift(D, X0, Y0)
    print(p, 'base', round(dv, 3), 'masses', len(D['masses']), 'dark', len(D['dark']), 'bright', len(D['bright']))
def fillholes(m, maxA=400):
    inv = (1 - m).astype(np.uint8); n, lab, st, _ = cv2.connectedComponentsWithStats(inv, connectivity=4)
    for i in range(1, n):
        if st[i, 4] < maxA: m[lab == i] = 1
    return m
fprm = dict(prm, blobs=0, rim=0, T=0.45, HId=8, LOd=3.5, minlen=8, minA=12, holeA=12, spmax=25)   # single frames: grain-safe
for n in range(1331, 1382):
    Dn = ST[f'D{n}']; P = ST[f'P{n}'].astype(np.float32)
    s = (Dn > float(os.environ.get('FTHR', 26))).astype(np.uint8)
    s = cv2.morphologyEx(s, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    s = fillholes(s)
    body = cv2.dilate(sils[ph(n)], np.ones((3, 3), np.uint8))
    f = (s & (1 - body)).astype(np.uint8)
    f[:int(os.environ.get('FY', 380))] = 0     # only under the belly
    f = cv2.morphologyEx(f, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    nn, lab, st, _ = cv2.connectedComponentsWithStats(f, 8)
    keep = [i for i in range(1, nn) if st[i, 4] >= 40]
    f = np.isin(lab, keep).astype(np.uint8)
    if f.sum() == 0: continue
    # overlap the body edge by 2 px so the leg joins without a seam
    f = (cv2.dilate(f, np.ones((3, 3), np.uint8)) & s).astype(np.uint8)
    dv = float(np.median(P[(f > 0) & (P < 0.2)])) if ((f > 0) & (P < 0.2)).sum() > 10 else 0.06
    D = trace_image(cv2.GaussianBlur(P, (0, 0), 0.8), dict(fprm, basev=dv), allowed=f)
    res['feet'][n] = shift(D, X0, Y0)
print('feet frames', len(res['feet']))
pickle.dump(res, open(out, 'wb'))
