# s28t: the mug's motion in the SOURCE (measurement): multi-scale template matching of the mug's body (its 129.32 box,
# scaled), searched round the previous frame's position + velocity. -> mugtrack.json {frame_t: [u_base, v_base, scale]}
import sys, os, json, numpy as np, cv2
os.chdir('/Users/computer/rootline/apprentice-film'); sys.path.insert(0, 'snapshots/s28t-tools')
from m import frame, SRC
B0 = np.array([1842.0, 741.0])
def gray(k):
    f = frame(SRC, k).astype(np.float32) / 255
    return cv2.GaussianBlur(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), (0, 0), 1.0)
g0 = gray(3233); x0, y0, x1, y1 = 1770, 580, 1916, 748          # body + rim, handle mostly left out (it turns)
tpl0 = g0[y0:y1, x0:x1]
res = {'129.32': [1842.0, 741.0, 1.0]}; ims = []
prev = np.array([1842.0, 741.0]); vel = np.array([40.0, 4.0]); s_prev = 1.0
for k in range(3234, 3254):
    t = k / 25; g = gray(k); best = None
    for s in np.arange(max(0.95, s_prev - 0.03), s_prev + 0.035, 0.0025):
        tt = cv2.resize(tpl0, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        pu, pv = prev + vel
        px, py = pu + (x0 - B0[0]) * s, pv + (y0 - B0[1]) * s
        vis_w = int(min(tt.shape[1], 2206 - 4 - (px - 60)))
        if vis_w < 50: continue
        tt = tt[:, :min(tt.shape[1], vis_w)]
        sx0, sy0 = int(max(0, px - 60)), int(max(0, py - 40)); sx1, sy1 = int(min(2206, px + 60 + tt.shape[1])), int(min(946, py + 40 + tt.shape[0]))
        if sx1 - sx0 <= tt.shape[1] or sy1 - sy0 <= tt.shape[0]: continue
        r = cv2.matchTemplate(g[sy0:sy1, sx0:sx1], tt, cv2.TM_CCOEFF_NORMED)
        _, mv, _, ml = cv2.minMaxLoc(r)
        if best is None or mv > best[0]:
            mx, my = ml
            def para(a, b_, c): d = a - 2 * b_ + c; return 0.0 if abs(d) < 1e-9 else 0.5 * (a - c) / d
            ox = para(r[my, mx - 1], r[my, mx], r[my, mx + 1]) if 0 < mx < r.shape[1] - 1 else 0
            oy = para(r[my - 1, mx], r[my, mx], r[my + 1, mx]) if 0 < my < r.shape[0] - 1 else 0
            X, Y = sx0 + mx + ox, sy0 + my + oy
            best = (mv, s, X - (x0 - B0[0]) * s, Y - (y0 - B0[1]) * s)
    if best is None: break
    mv, s, u, v = best
    if f"{(k-1)/25:.2f}" in res and np.hypot(u - prev[0], v - prev[1]) < 0.5: pass
    vel = np.array([u, v]) - prev if np.hypot(u - prev[0], v - prev[1]) > 2 else vel     # (129.56 repeats 129.52)
    prev = np.array([u, v]); s_prev = s
    res[f"{t:.2f}"] = [float(u), float(v), float(s)]
    print(f"{t:.2f} base ({u:.1f},{v:.1f}) s {s:.4f} score {mv:.3f}", flush=True)
json.dump(res, open('snapshots/s28t-tools/mugtrack.json', 'w'))
MUG = [[1775, 592], [1790, 587], [1842, 584], [1895, 587], [1909, 592], [1909, 612], [1928, 630], [1930, 660], [1925, 685],
       [1909, 698], [1909, 730], [1900, 738], [1842, 744], [1785, 738], [1775, 730]]
for key in sorted(res, key=float):
    k = round(float(key) * 25)
    if k % 2 == 0: continue
    u, v, s = res[key]
    P = (np.array(MUG, float) - B0) * s + [u, v]
    f = frame(SRC, k).copy(); cv2.polylines(f, [np.int32(np.round(P))], True, (0, 255, 0), 1)
    cx, cy = P.mean(0).astype(int); xa = max(0, min(2206 - 260, cx - 130)); ya = max(0, cy - 110)
    c = f[ya:ya + 220, xa:xa + 260].copy(); cv2.putText(c, key, (4, 16), 0, 0.5, (0, 0, 255), 1); ims.append(c)
while len(ims) % 4: ims.append(np.zeros_like(ims[0]))
cv2.imwrite('snapshots/s28t-work/mugtrack.jpg', np.vstack([np.hstack(ims[i:i + 4]) for i in range(0, len(ims), 4)]))
