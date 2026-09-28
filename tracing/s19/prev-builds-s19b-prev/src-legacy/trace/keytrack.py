# Follow a traced key drawing through neighbouring frames (measurement only): ECC (affine) of the key frame's owl
# (silhouette above the floor line, eroded) onto each frame, sequentially outward from the key; while the card
# stands (t < 61.44) each result is validated by the IoU of the moved key silhouette against the frame's own owl
# silhouette (background difference). Usage: keytrack.py key_t floor_y t1,t2,... (in order away from the key)
import sys, json, numpy as np, cv2
from common import frame
from owlmask import src_mask
kt = float(sys.argv[1]); fy = int(sys.argv[2]); times = [float(t) for t in sys.argv[3].split(',')]
Km = src_mask(kt); Km[fy:] = 0
tm = cv2.erode(Km, np.ones((7, 7), np.uint8))
tmpl = cv2.GaussianBlur(frame(int(round(kt * 25))), (0, 0), 1.5).astype(np.float32)
Wp = np.eye(2, 3, dtype=np.float32); out = []
for t in times:
    I = cv2.GaussianBlur(frame(int(round(t * 25))), (0, 0), 1.5).astype(np.float32)
    cc = -1
    for sc in (4, 2, 1):
        ts = cv2.resize(tmpl, None, fx=1 / sc, fy=1 / sc, interpolation=cv2.INTER_AREA); Is = cv2.resize(I, None, fx=1 / sc, fy=1 / sc, interpolation=cv2.INTER_AREA)
        ms = cv2.resize(tm, (ts.shape[1], ts.shape[0]), interpolation=cv2.INTER_NEAREST)
        Ws = Wp.copy(); Ws[:, 2] /= sc
        try: cc, Ws = cv2.findTransformECC(ts, Is, Ws, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-5), ms, 5)
        except cv2.error: cc = -1
        Ws[:, 2] *= sc; Wp = Ws
    iou = None
    if t < 61.44:
        moved = cv2.warpAffine(Km, Wp, (Km.shape[1], Km.shape[0]), flags=cv2.INTER_NEAREST)
        fm = src_mask(t); fm[fy + 20:] = 0; mv = moved.copy(); mv[fy + 20:] = 0
        iou = float((fm & mv).sum() / max(1, (fm | mv).sum()))
    out.append([t, round(float(cc), 3), None if iou is None else round(iou, 3)] + Wp.ravel().round(5).tolist())
    print(t, 'cc', round(float(cc), 3), 'iou', None if iou is None else round(iou, 3), 'A', Wp.ravel().round(3).tolist(), flush=True)
print(json.dumps(out))
