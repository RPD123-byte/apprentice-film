# eyetrack2.py : his eyes past 21.64, where the b1 track (20.56 template, one affine) stopped. Per eye, frame by frame
# from the 21.64 track: an ECC affine between CONSECUTIVE source frames over the eye region (brow + lids; the iris
# masked round its previous place), composed onto the previous frame's placement; then the pupil (darkest compact
# blob inside the carried opening). Near eye (R) to 22.44; far eye (L) until the face edge covers it.
# Prints JSON rows for s04/eyetrack.js. Measurements only.
import cv2, numpy as np, json, sys, os
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s04/trace')
from grade import degrade
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap=None
def src(fi):
    global cap
    p=f'{SP}/{fi}.png'
    if os.path.exists(p): return cv2.imread(p)
    if cap is None: cap=cv2.VideoCapture(V)
    cap.set(cv2.CAP_PROP_POS_FRAMES,fi); ok,f=cap.read(); cv2.imwrite(p,f); return f
def P(fi): return degrade(cv2.cvtColor(src(fi),cv2.COLOR_BGR2GRAY).astype(np.float32), fi/25).astype(np.float32)
EYES = {
  'L': dict(box=(760, 170, 960, 390), iris=(890, 334, 32), open=[[774,323],[785,311],[800,304],[820,299],[845,297],[868,299],[890,303],[908,310],[922,319],[933,331],[941,343],[930,347],[912,352],[890,356],[865,357],[840,357],[815,353],[795,345],[781,335]]),
  'R': dict(box=(1140, 165, 1330, 380), iris=(1268, 324, 32), open=[[1165,334],[1178,312],[1195,298],[1220,292],[1250,292],[1275,295],[1293,302],[1308,313],[1316,322],[1300,332],[1278,343],[1250,349],[1220,350],[1192,347],[1170,340]]),
}
A0 = {'L': [0.59642, 0.07804, 441.30374, 0.02865, 0.90187, -11.75036], 'R': [1.09587, 0.15659, -99.69936, 0.0474, 0.90987, -31.7841]}
P0 = {'L': [991.3, 316.8], 'R': [1306.4, 323.2]}
END = {'L': int(sys.argv[1]) if len(sys.argv) > 1 else 548, 'R': 561}
blur = lambda x: cv2.GaussianBlur(x, (0, 0), 1.5)
res = {}
for k, E in EYES.items():
    A = np.array(A0[k], np.float64).reshape(2, 3); pp = P0[k]
    prev = blur(P(541))
    for f in range(542, END[k] + 1):
        cur = blur(P(f))
        if f == 552:   # 22.08 repeats 22.04
            res.setdefault(f'{f/25:.2f}', {})[k] = res[f'{(f-1)/25:.2f}'][k]; prev = cur; continue
        # template: the previous frame's eye region (the carried box's bounding rect), the iris masked
        x0, y0, x1, y1 = E['box']
        corners = np.array([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], np.float64) @ A[:, :2].T + A[:, 2]
        bx0, by0 = np.floor(corners.min(0)).astype(int); bx1, by1 = np.ceil(corners.max(0)).astype(int)
        bx0, by0 = max(0, bx0), max(0, by0); bx1, by1 = min(2206, bx1), min(946, by1)
        tm = prev[by0:by1, bx0:bx1]
        m = np.full(cur.shape, 255, np.uint8)   # (the input's mask: the iris round its previous place)
        cv2.circle(m, (int(pp[0]), int(pp[1])), int(E['iris'][2] * abs(A[0, 0]) + 14), 0, -1)
        W0 = np.array([[1, 0, bx0], [0, 1, by0]], np.float32)
        try:
            cc, Wp = cv2.findTransformECC(tm, cur, W0, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-5), m, 5)
        except cv2.error as e:
            print('ECC fail', str(e)[:200]); cc, Wp = -1, W0
        # Wp maps template patch coords (u) -> cur frame: x = Wp @ [u,1], u = prev_x - (bx0,by0)
        L = Wp[:, :2].astype(np.float64); tt = Wp[:, 2].astype(np.float64) - L @ np.array([bx0, by0], np.float64)
        Inc = np.hstack([L, tt[:, None]])                    # prev frame -> cur frame
        A = np.hstack([Inc[:, :2] @ A[:, :2], (Inc[:, :2] @ A[:, 2] + Inc[:, 2])[:, None]])
        # pupil: darkest compact blob in the carried opening
        F = cv2.GaussianBlur(P(f), (0, 0), 1.0)
        op = np.array(E['open'], np.float64) @ A[:, :2].T + A[:, 2]
        mk = np.zeros(F.shape, np.uint8); cv2.fillPoly(mk, [op.astype(np.int32)], 1); mk = cv2.erode(mk, np.ones((5, 5), np.uint8))
        dk = ((F < 40) & (mk > 0)).astype(np.uint8)
        n, lab, st, cen = cv2.connectedComponentsWithStats(dk)
        best = None
        for j in range(1, n):
            a = st[j, cv2.CC_STAT_AREA]; w, h = st[j, cv2.CC_STAT_WIDTH], st[j, cv2.CC_STAT_HEIGHT]
            if a < 20 or a > 400 or max(w, h) > 2.4 * min(w, h) or a / (w * h) < 0.45: continue
            if best is None or a > best[0]: best = (a, cen[j])
        pp_new = [round(float(best[1][0]), 1), round(float(best[1][1]), 1)] if best else None
        if pp_new: pp = pp_new
        else: pp = list(Inc[:, :2] @ np.array(pp) + Inc[:, 2])
        res.setdefault(f'{f/25:.2f}', {})[k] = {'A': [round(float(v), 5) for v in A.ravel()], 'p': pp_new, 'cc': round(float(cc), 3)}
        print(f'{f/25:.2f} {k} cc {cc:.3f} a {A[0,0]:.3f} b {A[0,1]:.3f} c {A[1,0]:.3f} d {A[1,1]:.3f} t {A[0,2]:.1f},{A[1,2]:.1f} pupil {pp_new}', flush=True)
        prev = cur
json.dump(res, open('/Users/computer/rootline/apprentice-film/snapshots/s04-fix1w/eyetrack2.json', 'w'))
