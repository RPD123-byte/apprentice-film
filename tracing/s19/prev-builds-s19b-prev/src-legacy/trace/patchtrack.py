# Card tracking through the lift by patch matching (measurement only). Patches of the source's own standing card
# (57.32/57.36 average, rectified with the static quad) around textured points — the text-box corners, the words,
# the smiley, the trash icon, the buttons, the paper's rounded corners — are warped by the predicted homography so
# they look as they should in the frame, then found by normalised cross-correlation in a search window; a RANSAC
# homography through the matches (occluded patches score low and drop out) is refined on the keylines
# (linemeas.robust). The prediction is the previous frame's pose plus a damped velocity.
import sys, json, numpy as np, cv2
import linemeas as LM
from common import frame
CW, CH = 465, 648
QS = np.float32([[1093.2, 86.9], [1578.4, 50.7], [1686.5, 802.5], [995.7, 774.1]])
Hs = LM.Hq(QS)
src = np.mean([frame(1433), frame(1434)], 0).astype(np.float32)
M = 60
Tm = np.array([[1, 0, -M], [0, 1, -M], [0, 0, 1]], float)
TPL = cv2.warpPerspective(src, Hs @ Tm, (CW + 2 * M, CH + 2 * M), flags=cv2.WARP_INVERSE_MAP | cv2.INTER_LINEAR)   # card units + margin
A = LM.A
PTS = [(A['x0'], A['y0']), (A['x1'], A['y0']), (A['x0'], A['y1']), (A['x1'], A['y1']), (A['divX'], A['btnY']), (A['divX'], A['y1']),
       (A['x0'], A['btnY']), (A['x1'], A['btnY']), (110, 205), (190, 205), (270, 205), (350, 205), (196, 78), (295, 80), (142, 566), (328, 566),
       (20, 20), (445, 20), (20, 628), (445, 628), (44.8, 380), (424, 380), (232, 153.8), (0, 330), (465, 330), (232, 0), (232, 648)]
def match(g, H, u, v, half=34, S=40, blur=1.2):
    # template patch: sample TPL on a frame-aligned grid around the predicted position (through H^-1)
    p = LM.ph(H, np.array([[u, v]], float))[0]
    xs = np.arange(-half, half + 1) + round(p[0]); ys = np.arange(-half, half + 1) + round(p[1])
    X, Y = np.meshgrid(xs, ys)
    q = np.stack([X.ravel(), Y.ravel(), np.ones(X.size)], 1) @ np.linalg.inv(H).T
    uu = (q[:, 0] / q[:, 2] + M).reshape(X.shape).astype(np.float32); vv = (q[:, 1] / q[:, 2] + M).reshape(X.shape).astype(np.float32)
    patch = cv2.remap(TPL, uu, vv, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    if patch.std() < 8: return None
    x0, y0 = round(p[0]) - half - S, round(p[1]) - half - S
    x1, y1 = round(p[0]) + half + S + 1, round(p[1]) + half + S + 1
    if x0 < 0 or y0 < 0 or x1 > g.shape[1] or y1 > g.shape[0]: return None
    win = g[y0:y1, x0:x1]
    r = cv2.matchTemplate(cv2.GaussianBlur(win, (0, 0), blur), cv2.GaussianBlur(patch, (0, 0), blur), cv2.TM_CCOEFF_NORMED)
    _, mx, _, loc = cv2.minMaxLoc(r)
    # subpixel
    lx, ly = loc; dx = dy = 0
    if 0 < lx < r.shape[1] - 1: dx = 0.5 * (r[ly, lx - 1] - r[ly, lx + 1]) / (r[ly, lx - 1] - 2 * r[ly, lx] + r[ly, lx + 1] + 1e-9)
    if 0 < ly < r.shape[0] - 1: dy = 0.5 * (r[ly - 1, lx] - r[ly + 1, lx]) / (r[ly - 1, lx] - 2 * r[ly, lx] + r[ly + 1, lx] + 1e-9)
    return (p[0] + (lx + dx - S), p[1] + (ly + dy - S)), mx
def step(g, q, S, thr=0.6):
    H = LM.Hq(q); src_pts = []; dst = []; sc = []
    for (u, v) in PTS:
        m = match(g, H, u, v, S=S)
        if m is None or m[1] < thr: continue
        src_pts.append((u, v)); dst.append(m[0]); sc.append(m[1])
    if len(dst) < 5: return q, len(dst), None
    Hm, inl = cv2.findHomography(np.float32(src_pts), np.float32(dst), cv2.RANSAC, 3.0)
    if Hm is None or inl.sum() < 5: return q, len(dst), None
    qn = LM.ph(Hm, np.array([[0, 0], [CW, 0], [CW, CH], [0, CH]], float))
    return qn, int(inl.sum()), float(np.mean(np.array(sc)[inl.ravel() > 0]))
def track_frame(n, qp):
    g = frame(n).astype(np.float32)
    q = qp; info = []
    for S in (48, 20, 8):
        q2, ni, ms = step(g, q, S)
        info.append((S, ni, None if ms is None else round(ms, 2)))
        if ms is not None: q = q2
    return q, info
if __name__ == '__main__':
    times = [float(t) for t in sys.argv[1].split(',')]
    q = np.array(json.load(open(sys.argv[2])), float).reshape(4, 2); out = sys.argv[3]
    lines = '--lines' in sys.argv
    res = []; prev = q; prev2 = None
    for t in times:
        n = int(round(t * 25))
        if np.abs(frame(n) - frame(n - 1)).mean() < 3.0:
            res.append([t] + [round(float(v), 1) for v in prev.ravel()]); print(t, 'repeat', flush=True); json.dump(res, open(out, 'w')); continue
        qp = prev if prev2 is None else prev + 0.5 * (prev - prev2)
        q, info = track_frame(n, qp)
        rms = None
        if lines:
            H = LM.Hq(q); rough = []
            for nm in LM.MODEL:
                s0, s1 = LM.model_seg(nm); P = LM.ph(H, np.array([s0, s1], float)); cs = LM.clip_seg(P[0], P[1])
                if cs is not None and np.linalg.norm(cs[1] - cs[0]) > 50: rough.append((nm, (*cs[0], *cs[1])))
            ql, rms, names = LM.robust(t, rough, q, R=5, repredict=False)
            if rms < 2.0 and len(names) >= 5: q = ql
            else: rms = None
        prev2, prev = prev, q
        res.append([t] + [round(float(v), 1) for v in q.ravel()])
        print(t, info, 'lines rms', None if rms is None else round(rms, 2), np.round(q, 1).tolist(), flush=True)
        json.dump(res, open(out, 'w'))
        img = frame(n, gray=False); H = LM.Hq(q)
        for nm in LM.MODEL:
            s0, s1 = LM.model_seg(nm); P = LM.ph(H, np.linspace(s0, s1, 50))
            cv2.polylines(img, [np.round(np.clip(P, -3000, 5000)).astype(np.int32)], False, (0, 255, 0), 2)
        P = LM.ph(H, np.linspace((85, 214), (381, 214), 30)); cv2.polylines(img, [np.round(np.clip(P, -3000, 5000)).astype(np.int32)], False, (255, 255, 0), 1)
        cv2.putText(img, f'{t:.2f}', (20, 60), 0, 1.6, (0, 255, 255), 3)
        cv2.imwrite(f'/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-ref/kc/pt-{t:.2f}.jpg', cv2.resize(img, None, fx=0.4, fy=0.4))
