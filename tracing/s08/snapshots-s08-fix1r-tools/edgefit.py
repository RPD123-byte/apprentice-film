# Edge softness by region: erf fits of profiles across strong source edges, the same points in the render.
# usage: python3 edgefit.py RDIR [frames=764,765] [region,...]
import cv2, numpy as np, sys
sys.path.insert(0, 'snapshots/s08-fix1r-tools')
from cam import M
from scipy.optimize import least_squares
from scipy.special import erf
rd = sys.argv[1]
frames = [int(a) for a in (sys.argv[2] if len(sys.argv) > 2 else "764,765").split(",")]
REG = {
    # name: (x0, y0, x1, y1, mode) mode: 'bright' = one side must be > 140 luma
    "ure": (0, 610, 1100, 946, "bright"),
    "date1": (0, 330, 760, 422, "bright"),
    "columbus": (110, 428, 420, 484, "bright"),
    "lobes": (0, 200, 560, 620, "any"),
    "fan": (240, 480, 560, 620, "any"),
    "ribbon": (780, 20, 1440, 700, "any"),
    "star": (960, 20, 1060, 110, "any"),
    "cloud": (1600, 700, 2206, 946, "any"),
    "card": (1440, 175, 1925, 840, "cardedge"),
    "cloudtop": (1915, 700, 2206, 830, "any"),
    "cloudbody": (1600, 712, 2206, 946, "any"),
    "Uleft": (780, 20, 1250, 700, "any"),
    "Uright": (1250, 20, 1440, 700, "any"),
    "tailR": (1920, 20, 2206, 360, "any"),
    "rstripes": (560, 610, 800, 946, "any"),
}
sel = sys.argv[3].split(",") if len(sys.argv) > 3 else list(REG)
def luma(im): return (im[..., 2] * 0.299 + im[..., 1] * 0.587 + im[..., 0] * 0.114).astype(np.float32)
def fit(p, t):
    lo, hi = p.min(), p.max()
    def f(q):
        a, b, c, s = q
        return a + b * 0.5 * (1 + erf((t - c) / (abs(s) * 1.4142 + 1e-6))) - p
    r = least_squares(f, [lo if p[0] < p[-1] else hi, (hi - lo) if p[0] < p[-1] else (lo - hi), 0.0, 1.0])
    a, b, c, s = r.x
    res = np.sqrt(np.mean(r.fun ** 2))
    return abs(s), c, abs(b), res
T = np.arange(-5, 5.01, 0.25)
out = {}
for k in frames:
    S = luma(cv2.imread(f"snapshots/s08-p4-src/f{k}.png").astype(np.float32))
    R = luma(cv2.imread(f"{rd}/r{k}.png").astype(np.float32))
    Sb = cv2.GaussianBlur(S, (0, 0), 1.2)
    gx = cv2.Sobel(Sb, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(Sb, cv2.CV_32F, 0, 1, ksize=3)
    mag = np.hypot(gx, gy)
    for name in sel:
        x0, y0, x1, y1, mode = REG[name]
        mk = M(k); q = np.array([[x0, y0, 1], [x1, y0, 1], [x0, y1, 1], [x1, y1, 1]], float) @ mk.T
        x0, y0 = int(max(0, q[:, 0].min())), int(max(0, q[:, 1].min())); x1, y1 = int(min(2206, q[:, 0].max())), int(min(946, q[:, 1].max()))
        if x1 - x0 < 10 or y1 - y0 < 10: continue
        m = mag[y0:y1, x0:x1]
        # non-max suppression (coarse): local max in a 5x5 window and strong
        dil = cv2.dilate(m, np.ones((7, 7), np.uint8))
        cand = np.argwhere((m >= dil) & (m > 60))
        rs = np.random.RandomState(1); rs.shuffle(cand)
        ss, rr, dc = [], [], []
        for (j, i) in cand[:1500]:
            y, x = j + y0, i + x0
            if x < 8 or y < 14 or x > S.shape[1] - 9 or y > S.shape[0] - 9: continue
            nx, ny = gx[y, x], gy[y, x]; n = np.hypot(nx, ny); nx /= n; ny /= n
            if mode == "cardedge" and not (abs(nx) > 0.97 or abs(ny) > 0.97): continue
            px = (x + T * nx).astype(np.float32); py = (y + T * ny).astype(np.float32)
            ps = cv2.remap(S, px[None], py[None], cv2.INTER_LINEAR)[0]
            pr = cv2.remap(R, px[None], py[None], cv2.INTER_LINEAR)[0]
            if mode == "bright" and max(ps[0], ps[-1]) < 140: continue
            s1, c1, b1, e1 = fit(ps, T)
            if b1 < 40 or e1 > 0.06 * b1 or abs(c1) > 1.5 or s1 > 4: continue
            s2, c2, b2, e2 = fit(pr, T)
            if b2 < 30 or e2 > 0.08 * b2 or abs(c2) > 2.5 or s2 > 4: continue
            ss.append(s1); rr.append(s2); dc.append(c2 - c1)
            if len(ss) >= 250: break
        o = out.setdefault(name, [[], [], []])
        o[0] += ss; o[1] += rr; o[2] += dc
for name in sel:
    if name not in out: print(f"{name:9s} out of frame"); continue
    ss, rr, dc = (np.array(v) for v in out[name])
    if len(ss) == 0: print(f"{name:9s} no edges"); continue
    print(f"{name:9s} n {len(ss):4d}  src {np.median(ss):.2f}  ren {np.median(rr):.2f}  diff {np.median(rr - ss):+.2f}  (q25/75 src {np.percentile(ss,25):.2f}/{np.percentile(ss,75):.2f} ren {np.percentile(rr,25):.2f}/{np.percentile(rr,75):.2f})  shift {np.median(dc):+.2f}")
