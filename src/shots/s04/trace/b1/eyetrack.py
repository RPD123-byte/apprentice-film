# eyetrack.py : where his eyes are on every key frame. Per eye, an ECC affine from the 20.56 frame's eye region
# (brow + lids; the iris masked out, it moves) to each key frame, chained outward from 20.56 through the key times;
# then the pupil (darkest compact blob inside the carried eye opening) on that frame. Writes eyetrack.json:
# { T: { L: {A: [a,b,tx,c,d,ty], cc, pupil: [x,y] | null}, R: {...} } } and a debug sheet. Measurements only.
import cv2, numpy as np, json, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s04-b1/tr')
from grade import degrade
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap = cv2.VideoCapture(V)
def P(t):
    cap.set(1, int(round(t * 25))); ok, f = cap.read(); g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32)
    return degrade(g, t).astype(np.float32)
keys = open('/Users/computer/rootline/apprentice-film/snapshots/s04-b1k/keytimes.txt').read().split(',')
keys = [float(k) for k in keys if float(k) <= 22.44]
EYES = {  # patch (x0,y0,x1,y1) around brow + eye at 20.56; iris circle to mask; opening polygon (for the pupil search)
  'L': dict(box=(760, 170, 960, 390), iris=(890, 334, 32), open=[[774,323],[785,311],[800,304],[820,299],[845,297],[868,299],[890,303],[908,310],[922,319],[933,331],[941,343],[930,347],[912,352],[890,356],[865,357],[840,357],[815,353],[795,345],[781,335]]),
  'R': dict(box=(1140, 165, 1330, 380), iris=(1268, 324, 32), open=[[1165,334],[1178,312],[1195,298],[1220,292],[1250,292],[1275,295],[1293,302],[1308,313],[1316,322],[1300,332],[1278,343],[1250,349],[1220,350],[1192,347],[1170,340]]),
}
ref = P(20.56)
blur = lambda x: cv2.GaussianBlur(x, (0, 0), 1.5)
res = {}
def track(order):
    for k, E in EYES.items():
        A = np.array([[1, 0, 0], [0, 1, 0]], np.float32)
        x0, y0, x1, y1 = E['box']
        cx, cy, r = E['iris']
        rm = np.zeros(ref.shape, np.uint8); cv2.circle(rm, (cx, cy), r + 4, 255, -1)
        tmpl = blur(cv2.inpaint(np.clip(ref, 0, 255).astype(np.uint8), rm, 7, cv2.INPAINT_TELEA).astype(np.float32))[y0:y1, x0:x1]
        for t in order:
            F = blur(P(t))
            # warp maps template coords (patch) -> frame coords; ECC estimates warp W with I(W(x)) ~ T(x)
            W = A.copy(); W[:, 2] = W[:, 2] + W[:, :2] @ np.array([x0, y0], np.float32) if False else W[:, 2]
            # parametrise in frame coords: frame = A @ [x_ref, y_ref, 1]; patch coords x_ref = u + x0
            Wp = np.array([[A[0, 0], A[0, 1], A[0, 0] * x0 + A[0, 1] * y0 + A[0, 2]], [A[1, 0], A[1, 1], A[1, 0] * x0 + A[1, 1] * y0 + A[1, 2]]], np.float32)
            # the input's iris (it moves) is masked round its predicted place, generously
            px_, py_ = A[:, :2] @ np.array([cx, cy], np.float32) + A[:, 2]
            m = np.full(F.shape, 255, np.uint8); cv2.circle(m, (int(px_), int(py_)), int(r * abs(A[0, 0]) + 26), 0, -1)
            try:
                cc, Wp = cv2.findTransformECC(tmpl, F, Wp, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-5), m, 5)
            except cv2.error:
                cc = -1
            A = np.array([[Wp[0, 0], Wp[0, 1], Wp[0, 2] - Wp[0, 0] * x0 - Wp[0, 1] * y0], [Wp[1, 0], Wp[1, 1], Wp[1, 2] - Wp[1, 0] * x0 - Wp[1, 1] * y0]], np.float32)
            res.setdefault(f'{t:.2f}', {})[k] = {'A': [round(float(v), 5) for v in A.ravel()], 'cc': round(float(cc), 3)}
            print(f'{t:.2f} {k} cc {cc:.3f} A {np.round(A.ravel(), 3).tolist()}', flush=True)
i0 = keys.index(20.56)
track(keys[i0:])
track(keys[:i0 + 1][::-1])
# pupils: darkest compact blob inside the carried opening
for t in keys:
    F = cv2.GaussianBlur(P(t), (0, 0), 1.0)
    for k, E in EYES.items():
        R = res[f'{t:.2f}'][k]; A = np.array(R['A']).reshape(2, 3)
        op = np.array(E['open'], np.float32) @ A[:, :2].T + A[:, 2]
        mk = np.zeros(F.shape, np.uint8); cv2.fillPoly(mk, [op.astype(np.int32)], 1)
        mk = cv2.erode(mk, np.ones((5, 5), np.uint8))
        dk = ((F < 40) & (mk > 0)).astype(np.uint8)
        n, lab, st, cen = cv2.connectedComponentsWithStats(dk)
        best = None
        for j in range(1, n):
            a = st[j, cv2.CC_STAT_AREA]; w, h = st[j, cv2.CC_STAT_WIDTH], st[j, cv2.CC_STAT_HEIGHT]
            if a < 25 or a > 400 or max(w, h) > 2.2 * min(w, h): continue
            fill = a / (w * h)
            if fill < 0.5: continue
            if best is None or a > best[0]: best = (a, cen[j])
        R['pupil'] = [round(float(best[1][0]), 1), round(float(best[1][1]), 1)] if best else None
        R['pupilA'] = int(best[0]) if best else 0
json.dump(res, open('/Users/computer/rootline/apprentice-film/snapshots/s04-b1/tr/eyetrack.json', 'w'))
for t in keys: print(f'{t:.2f}', {k: (v['cc'], v['pupil'], v['pupilA']) for k, v in res[f"{t:.2f}"].items()})
