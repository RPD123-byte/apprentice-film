# Track the owl's head+body through a phase by ECC alignment (affine) of a source key frame's owl interior
# (silhouette eroded, wings cut away by a column band) to each frame, sequentially (measurement only).
# Usage: owltrack.py key_t x0 x1 t0,t1,... out.json      (x0..x1: the body/head column band in the key frame)
import sys, json, numpy as np, cv2
from common import frame
from owlmask import src_mask
kt = float(sys.argv[1]); x0, x1 = int(sys.argv[2]), int(sys.argv[3]); times = [float(t) for t in sys.argv[4].split(',')]; out = sys.argv[5]
K = frame(int(round(kt * 25)))
m = src_mask(kt); m[:, :x0] = 0; m[:, x1:] = 0; m[850:] = 0
m = cv2.erode(m, np.ones((9, 9), np.uint8))
tmpl = cv2.GaussianBlur(K, (0, 0), 1.5).astype(np.float32)
Wp = np.eye(2, 3, dtype=np.float32); res = []
for t in times:
    I = cv2.GaussianBlur(frame(int(round(t * 25))), (0, 0), 1.5).astype(np.float32)
    best = None
    for sc in (4, 2, 1):
        ts = cv2.resize(tmpl, None, fx=1 / sc, fy=1 / sc, interpolation=cv2.INTER_AREA); Is = cv2.resize(I, None, fx=1 / sc, fy=1 / sc, interpolation=cv2.INTER_AREA)
        ms = cv2.resize(m, (ts.shape[1], ts.shape[0]), interpolation=cv2.INTER_NEAREST)
        Ws = Wp.copy(); Ws[:, 2] /= sc
        try:
            cc, Ws = cv2.findTransformECC(ts, Is, Ws, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-5), ms, 5)
        except cv2.error as e:
            cc = -1
        Ws[:, 2] *= sc; Wp = Ws; best = cc
    A = Wp[:, :2]; s = float(np.sqrt(abs(np.linalg.det(A)))); rot = float(np.degrees(np.arctan2(A[1, 0], A[0, 0])))
    ys, xs = np.nonzero(m); c = np.array([xs.mean(), ys.mean(), 1.0]); cf = Wp @ c
    res.append([t] + Wp.ravel().round(5).tolist())
    print(t, 'cc', round(float(best), 3), 'scale', round(s, 3), 'rot', round(rot, 1), 'centre', np.round(cf, 1).tolist(), flush=True)
json.dump(res, open(out, 'w'))
