# In-betweens from traced key drawings (measurement only). For each target frame, each candidate key within
# MAXD s is aligned onto the frame by ECC (affine; start from the silhouettes' centroid offset and a few start
# rotations), and scored by the IoU of the moved key silhouette against the frame's owl silhouette (above the
# floor line). The best (key, affine) with IoU >= MINIOU is printed as an OWLAFF row.
# Usage: keyplan.py keys(t,t,..) targets(t,t,..) out.json [MINIOU]
import sys, json, numpy as np, cv2
from common import frame
from owlmask import src_mask
keys = [float(v) for v in sys.argv[1].split(',')]; targets = [float(v) for v in sys.argv[2].split(',')]; out = sys.argv[3]
MINIOU = float(sys.argv[4]) if len(sys.argv) > 4 else 0.8; MAXD = float(__import__("os").environ.get("MAXD", 0.085)); FY = 850
KM = {}; KT = {}
for k in keys:
    m = src_mask(k); m[FY:] = 0; KM[k] = m
    KT[k] = cv2.GaussianBlur(frame(int(round(k * 25))), (0, 0), 1.5).astype(np.float32)
def ecc(k, I, W0):
    tm = cv2.erode(KM[k], np.ones((7, 7), np.uint8)); Wp = W0.astype(np.float32); cc = -1
    for sc in (4, 2, 1):
        ts = cv2.resize(KT[k], None, fx=1 / sc, fy=1 / sc, interpolation=cv2.INTER_AREA); Is = cv2.resize(I, None, fx=1 / sc, fy=1 / sc, interpolation=cv2.INTER_AREA)
        ms = cv2.resize(tm, (ts.shape[1], ts.shape[0]), interpolation=cv2.INTER_NEAREST)
        Ws = Wp.copy(); Ws[:, 2] /= sc
        try: cc, Ws = cv2.findTransformECC(ts, Is, Ws, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 150, 1e-5), ms, 5)
        except cv2.error: return None, -1
        Ws[:, 2] *= sc; Wp = Ws
    return Wp, cc
rows = []
for t in targets:
    I = cv2.GaussianBlur(frame(int(round(t * 25))), (0, 0), 1.5).astype(np.float32)
    fm = src_mask(t); fm[FY:] = 0
    if fm.sum() < 500: print(t, 'no owl'); continue
    fy_, fx_ = np.nonzero(fm); fc = np.array([fx_.mean(), fy_.mean()])
    best = None
    for k in keys:
        if abs(k - t) > MAXD or abs(k - t) < 1e-3: continue
        ky, kx = np.nonzero(KM[k]); kc = np.array([kx.mean(), ky.mean()])
        for rot in (0, -18, 18):
            R = cv2.getRotationMatrix2D((float(kc[0]), float(kc[1])), rot, 1.0); R[:, 2] += fc - kc
            Wp, cc = ecc(k, I, R)
            if Wp is None: continue
            mv = cv2.warpAffine(KM[k], Wp, (fm.shape[1], fm.shape[0]), flags=cv2.INTER_NEAREST); mv[FY:] = 0
            iou = float((fm & mv).sum() / max(1, (fm | mv).sum()))
            if best is None or iou > best[0]: best = (iou, k, Wp, cc, rot)
    if best is None: print(t, 'no key'); continue
    iou, k, Wp, cc, rot = best
    ok = iou >= MINIOU
    print(f'{t:.2f}', 'key', k, 'IoU', round(iou, 3), 'cc', round(float(cc), 3), 'rot0', rot, 'ACCEPT' if ok else 'reject', flush=True)
    if ok: rows.append([round(t, 2), f'{k:.2f}'] + [round(float(v), 4) for v in Wp.ravel()] + [round(iou, 3)])
json.dump(rows, open(out, 'w'))
