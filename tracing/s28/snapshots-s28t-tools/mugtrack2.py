# s28t: the mug's motion in the SOURCE (measurement). The camera model predicts where the mug (a vertical cylinder on the
# desk) projects in each frame and how big; a translation-only template match of the scaled 129.32 mug then measures the
# residual. -> mugtrack.json {frame_t: [u_base, v_base, scale]} (scale relative to 129.32; base = bottom centre)
import sys, os, json, numpy as np, cv2
os.chdir('/Users/computer/rootline/apprentice-film'); sys.path.insert(0, 'snapshots/s28t-tools/t'); sys.path.insert(0, 'snapshots/s28t-tools')
from geo import *
from m import frame, SRC
T0 = 129.32
B0 = np.array([1842.0, 741.0]); TOP0 = np.array([1842.0, 586.0])
B = hit(T0, B0[None], DESK)[0]
# height: the point above B (world -y) that projects onto the rim centre at T0
C0, R0 = cam(T0)
def proj(t, X): return project(t, X[None])[0]
hs = np.linspace(0.02, 0.3, 2801); err = [abs(proj(T0, B + np.array([0, -h, 0]))[1] - TOP0[1]) for h in hs]; h = hs[int(np.argmin(err))]
TOP = B + np.array([0, -h, 0])
print('mug base', B.round(4), 'height', round(h, 4))
def gray(k):
    f = frame(SRC, k).astype(np.float32) / 255
    return cv2.GaussianBlur(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), (0, 0), 1.0)
g0 = gray(round(T0 * 25)); x0, y0, x1, y1 = 1770, 580, 1934, 748
tpl0 = g0[y0:y1, x0:x1]
res = {}; ims = []
for k in range(3233, 3254):
    t = k / 25
    b = proj(t, B); tp = proj(t, TOP); s = (b[1] - tp[1]) / (B0[1] - TOP0[1])
    # predicted box of the template in this frame
    px, py = b[0] + (x0 - B0[0]) * s, b[1] + (y0 - B0[1]) * s
    tt = cv2.resize(tpl0, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
    g = gray(k)
    # only the visible part of the template (the mug leaves the frame on the right)
    vis_w = int(min(tt.shape[1], 2206 - 30 - px))
    du = dv = 0.0; score = None
    if vis_w > 40:
        tt = tt[:, :vis_w]
        sx0, sy0 = int(max(0, px - 30)), int(max(0, py - 30)); sx1, sy1 = int(min(2206, px + 30 + tt.shape[1])), int(min(946, py + 30 + tt.shape[0]))
        r = cv2.matchTemplate(g[sy0:sy1, sx0:sx1], tt, cv2.TM_CCOEFF_NORMED)
        _, score, _, ml = cv2.minMaxLoc(r)
        # sub-pixel peak
        mx, my = ml
        def para(a, b_, c): d = a - 2 * b_ + c; return 0.0 if abs(d) < 1e-9 else 0.5 * (a - c) / d
        ox = para(r[my, mx - 1], r[my, mx], r[my, mx + 1]) if 0 < mx < r.shape[1] - 1 else 0
        oy = para(r[my - 1, mx], r[my, mx], r[my + 1, mx]) if 0 < my < r.shape[0] - 1 else 0
        du, dv = sx0 + mx + ox - px, sy0 + my + oy - py
    res[f"{t:.2f}"] = [float(b[0] + du), float(b[1] + dv), float(s)]
    print(f"{t:.2f} pred base ({b[0]:.1f},{b[1]:.1f}) s {s:.4f}  match d ({du:+.1f},{dv:+.1f}) score {score if score is None else round(score,3)}", flush=True)
json.dump(res, open('snapshots/s28t-tools/mugtrack.json', 'w'))
# check sheet: the 129.32 outline carried by the measurement
MUG = [[1775, 592], [1790, 587], [1842, 584], [1895, 587], [1909, 592], [1909, 612], [1928, 630], [1930, 660], [1925, 685],
       [1909, 698], [1909, 730], [1900, 738], [1842, 744], [1785, 738], [1775, 730]]
for k in range(3233, 3254, 2):
    u, v, s = res[f"{k/25:.2f}"]
    P = (np.array(MUG, float) - B0) * s + [u, v]
    f = frame(SRC, k).copy(); cv2.polylines(f, [np.int32(np.round(P))], True, (0, 255, 0), 1)
    cx, cy = P.mean(0).astype(int); xa = max(0, min(2206 - 260, cx - 130)); ya = max(0, cy - 110)
    c = f[ya:ya + 220, xa:xa + 260].copy(); cv2.putText(c, f"{k/25:.2f}", (4, 16), 0, 0.5, (0, 0, 255), 1); ims.append(c)
while len(ims) % 4: ims.append(np.zeros_like(ims[0]))
cv2.imwrite('snapshots/s28t-work/mugtrack.jpg', np.vstack([np.hstack(ims[i:i + 4]) for i in range(0, len(ims), 4)]))
