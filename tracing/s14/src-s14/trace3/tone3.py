# Fit one linear value gradient per room face (pre-grade values) to the source, or correct the fitted tones
# against a render: tone3.py fit T            -> writes ../tone3.js from the source frame at T (R40 = 40.00)
#                  tone3.py fix T render.png  -> adds (source fit - render fit) to every face's tone
# Faces are geo3.js polygons; the visible part is the polygon minus everything drawn later (same layer, later
# layers), eroded 2 px, the owl masked out. Scalars only are written (v, gx, gy, cx, cy per face).
import sys, cv2, numpy as np, json
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *
ORDER = ['back', 'ceiling', 'floor', 'left', 'kbd', 'aside', 'right', 'late', 'synth', 'under', 'deskBase', 'deskLeg', 'deskTop']
OUT = ROOT + '/src/shots/s14/tone3.js'

def owl_mask(Lm, t):
    # the owl: the big bright blob low in the middle of the frame, its bounding ellipse (the dark cups) and a margin
    m = np.zeros((H, W), np.uint8)
    box = (820, 420, 1400, 946)
    sub = (Lm[box[1]:box[3], box[0]:box[2]] > 0.78).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(sub)
    if n > 1:
        k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
        blob = (lab == k).astype(np.uint8)
        m[box[1]:box[3], box[0]:box[2]] = blob
        x, y, w, h = st[k, :4]
        # the head + cups: the top third of the blob, widened
        cv2.ellipse(m, (box[0] + x + w // 2, box[1] + y + h // 5), (int(w * 0.28), int(h * 0.25)), 0, 0, 360, 1, -1)
    return cv2.dilate(m, np.ones((17, 17), np.uint8)) > 0

# layer planes (copy of room3.js LAYERS3) and the dolly (copy of s14.js DOLLY / DESK_CY)
PLANES = {'back': [0, 0, 0.78], 'ceiling': [0.000421, -0.001871, 0.5737], 'floor': [0.000339, 0.002547, -1.3272],
          'left': [-0.000515, 0.000061, 1.3940], 'aside': [0, 0, 0.89], 'kbd': [0, 0, 1.0], 'right': [0.000601, -0.000120, 0.2294], 'late': [0.000601, -0.000120, 0.2294],
          'synth': [0.0004, 0, 0.926], 'under': [0.000567, 0, 0.8212], 'deskBase': [0.000709, 0, 0.6449], 'deskLeg': [0, 0, 1.59],
          'deskTop': [0.000529, 0, 0.989]}
DESKL = ('synth', 'under', 'deskBase', 'deskLeg', 'deskTop')
DOLLY = [0, 0.03, 0.06, 0.091, 0.1221, 0.1714, 0.2052, 0.2395, 0.2726, 0.3076, 0.3413, 0.3769, 0.4122, 0.4495, 0.4857, 0.5223, 0.549, 0.549, 0.57]
DESK_CY = [[40.0, 640], [40.04, 637], [40.08, 634], [40.12, 632], [40.16, 630], [40.2, 628], [40.24, 626], [40.28, 622], [40.32, 619], [40.36, 618],
  [40.4, 617], [40.44, 614], [40.48, 611], [40.52, 609], [40.56, 607], [40.6, 603], [40.64, 600], [40.72, 598]]
C0 = (1104.5, 642.9)
def dolly(t): return DOLLY[int(round((t - 40.0) / 0.04))] if t >= 40 else 0.0
# camera side-shift per frame (s14.js EOFF; smoothed trace3/jointfit.py fit)
EOFF = [[0, 0], [0.5, 0], [0.9, -0.2], [1.1, -0.5], [1.0, -0.8], [0.7, -1.0], [0.5, -1.3], [0.3, -1.7], [0.1, -2.1], [-0.3, -2.4], [-0.6, -2.8],
        [-1.0, -3.2], [-1.4, -3.6], [-2.2, -4.0], [-3.2, -4.5], [-3.8, -5.0], [-3.8, -5.2], [-3.8, -5.2], [-3.8, -5.2]]
def eoff(t): return np.array(EOFF[int(round((t - 40.0) / 0.04))]) if t >= 40 else np.zeros(2)
def centre(L, t):
    if L in DESKL: return (1105, float(np.interp(t, [r[0] for r in DESK_CY], [r[1] for r in DESK_CY])))
    return C0
# per-layer extra dolly on the last frame (s14.js Dmap)
def doff(L, t):
    if t <= 40.62: return 0.0
    return {'deskLeg': 0.0045, 'late': 0.049}.get(L, 0.006 if L in DESKL else 0.0)
def fwd(P, L, t):
    d = dolly(t) + doff(L, t); pl = PLANES[L]; C = np.array(centre(L, t)); e = eoff(t) if L not in DESKL else np.zeros(2)
    P = np.asarray(P, np.float64)
    w = pl[0] * P[:, 0] + pl[1] * P[:, 1] + pl[2]
    if len(pl) > 3:
        S = np.stack([1 / np.maximum(0.02, 1 - d * w * pl[3]), 1 / np.maximum(0.02, 1 - d * w * pl[4])], 1)
        return C + (P - C - w[:, None] * e) * S
    k = 1 - d * w
    return C + (P - C - w[:, None] * e) / np.maximum(0.03, k)[:, None]
def inv(Q, L, t):
    # frame px -> R40 px for layer L
    d = dolly(t) + doff(L, t); pl = PLANES[L]; C = np.array(centre(L, t)); e = eoff(t) if L not in DESKL else np.zeros(2)
    Q = np.asarray(Q, np.float64)
    if len(pl) > 3:
        w = pl[2]
        return C + (Q - C) * np.array([1 - d * w * pl[3], 1 - d * w * pl[4]]) + w * e
    P = Q.copy()
    for _ in range(6):   # fixed point: p = C + (q - C)(1 - d w(p)) + w(p) e
        w = pl[0] * P[:, 0] + pl[1] * P[:, 1] + pl[2]
        P = C + (Q - C) * (1 - d * w)[:, None] + w[:, None] * e
    return P

def faces():
    G = geo()
    items = [(n, e) for n, e in G.items() if not (len(e) > 2 and e[2].get('open'))]
    items.sort(key=lambda it: ORDER.index(it[1][0]))  # stable: keeps geo order within a layer
    return items

def visible_masks(items, t=40.0):
    masks = []
    for n, e in items:
        m = np.zeros((H, W), np.uint8)
        P = np.array(fwd(shape_pts(e[1], 72), e[0], t), np.float32)
        P = np.clip(P, -20000, 20000)   # faces reaching behind the camera: keep their in-frame part
        cv2.fillPoly(m, [np.round(P * 4).astype(np.int32)], 1, cv2.LINE_8, 2)
        masks.append(m)
    occ = np.zeros((H, W), np.uint8)
    vis = [None] * len(masks)
    for i in range(len(masks) - 1, -1, -1):
        v = masks[i] & (1 - occ)
        vis[i] = cv2.erode(v, np.ones((3, 3), np.uint8))
        occ |= masks[i]
    return vis

def fit(V, mask, cx, cy, L='left', t=40.0):
    ys, xs = np.nonzero(mask)
    if len(xs) < 25: return None
    if len(xs) > 40000:
        k = np.linspace(0, len(xs) - 1, 40000).astype(int); xs, ys = xs[k], ys[k]
    b = V[ys, xs]
    R = inv(np.stack([xs + 0.5, ys + 0.5], 1), L, t)
    cx, cy = R[:, 0].mean(), R[:, 1].mean()     # tone centre = the visible part's centre (no extrapolation)
    A = np.stack([np.ones(len(xs)), R[:, 0] - cx, R[:, 1] - cy], 1)
    sol, *_ = np.linalg.lstsq(A, b, rcond=None)
    # keep the ramp inside what the visible part spans
    ex = np.percentile(np.abs(A[:, 1:]), 95, axis=0) + 1
    return (sol, len(xs), (cx, cy), ex)

def fit_all(img, t):
    Lm = luma(img)
    V = pregrade(Lm, t)
    HP = np.abs(Lm - cv2.GaussianBlur(Lm, (0, 0), 3.0))   # texture energy (mean |high-pass|)
    BP = np.abs(cv2.GaussianBlur(Lm, (0, 0), 2.5) - cv2.GaussianBlur(Lm, (0, 0), 12.0))   # brush-scale contrast
    om = owl_mask(Lm, t)
    items = faces()
    vis = visible_masks(items, t)
    res = {}
    for (n, e), m in zip(items, vis):
        P = np.array(shape_pts(e[1], 72), np.float32)
        cx, cy = P.mean(0)
        m = m.astype(bool) & ~om
        f = fit(V, m.astype(np.uint8), cx, cy, e[0], t)
        if f is None: continue
        (a, gx, gy), npx, (cx, cy), ex = f
        # keep the gradient to what the visible area supports (small areas: flat)
        if npx < 400: gx = gy = 0.0
        # the ramp may not take the face out of 0..1 over the polygon
        for _ in range(8):
            vals = [a + gx * (p[0] - cx) + gy * (p[1] - cy) for p in P]
            if min(vals) >= -0.05 and max(vals) <= 1.05: break
            gx *= 0.7; gy *= 0.7
        ys, xs = np.nonzero(m)
        hp = float(HP[ys, xs].mean()) if len(xs) else 0.0
        bp = float(BP[ys, xs].mean()) if len(xs) else 0.0
        # weight: visible area in R40 px (so a face magnified in a late frame does not outweigh the rest), and
        # frames where it is magnified > 3x count less (the plates hold 40.00-level detail only)
        Q = fwd(P, e[0], t); a0 = abs(cv2.contourArea(np.float32(P))); a1 = abs(cv2.contourArea(np.float32(Q)))
        magA = max(1.0, a1 / max(a0, 1.0))
        wgt = npx / magA / (1 + max(0.0, math.sqrt(magA) - 3.0))
        res[n] = [float(a), float(gx), float(gy), float(cx), float(cy), wgt, hp, bp]
    return res

def write(res):
    lines = ['// s14 round 3: fitted face tones (trace3/tone3.py): name: [v at (cx,cy), dv/dx, dv/dy, cx, cy, texture gain, brush gain]',
             '// (pre-grade values; the texture gain scales the face\'s fine dry-brush marks to the source\'s high-pass energy,',
             '// the brush gain its broad streaks to the source\'s band-pass (2.5-12 px) contrast)',
             'export const TONE3 = {']
    for n, r in res.items():
        r = list(r) + [1.0] * (7 - len(r))
        lines.append(f'  "{n}": [{r[0]:.4f}, {r[1]:.6f}, {r[2]:.6f}, {r[3]:.1f}, {r[4]:.1f}, {r[5]:.3f}, {r[6]:.3f}],')
    lines.append('};')
    open(OUT, 'w').write('\n'.join(lines) + '\n')

def read():
    try: return {k: (v + [1.0, 1.0])[:7] for k, v in load_js_obj(OUT, 'TONE3').items()}
    except Exception: return {}

def fit_multi(ts, imgs):
    acc = {}
    for t, im in zip(ts, imgs):
        for n, r in fit_all(im, t).items():
            acc.setdefault(n, []).append(r)
    out = {}
    for n, rs in acc.items():
        wsum = sum(r[5] for r in rs)
        out[n] = [sum(r[i] * r[5] for r in rs) / wsum for i in range(5)] + [int(wsum), sum(r[6] * r[5] for r in rs) / wsum, sum(r[7] * r[5] for r in rs) / wsum]
    return out

if __name__ == '__main__':
    mode = sys.argv[1]
    ts = [float(x) for x in sys.argv[2].split(',')]
    t = ts[0]
    S = fit_multi(ts, [src(x) for x in ts])
    if mode == 'fit':
        old = read()
        write({n: r[:5] + [old.get(n, [1] * 7)[5], old.get(n, [1] * 7)[6]] for n, r in S.items()}); print('fitted', len(S))
    else:
        R = fit_multi(ts, [cv2.imread(x) for x in sys.argv[3].split(',')])
        cur = read()
        k = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
        out = {}
        err = []; texe = []
        kt = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0
        for n, s in S.items():
            c = cur.get(n, s)
            r = R.get(n)
            if r is None: out[n] = c; continue
            # all three fits evaluated about the current tone's centre
            def at(f, x, y): return f[0] + f[1] * (x - f[3]) + f[2] * (y - f[4])
            x, y = c[3], c[4]
            d0 = at(s, x, y) - at(r, x, y)
            d = [d0, s[1] - r[1], s[2] - r[2]]
            err.append((abs(d[0]), n, s[5]))
            tg = c[5] * min(1.6, max(0.6, (max(1e-4, s[6]) / max(1e-4, r[6])) ** 0.8)) if kt > 0 else c[5]
            bg = c[6] * min(1.6, max(0.6, (max(1e-4, s[7]) / max(1e-4, r[7])) ** 0.8)) if kt > 0 else c[6]
            out[n] = [c[0] + k * d[0], c[1] + k * d[1], c[2] + k * d[2], c[3], c[4], min(4.0, max(0.1, tg)), min(5.0, max(0.05, bg))]
            texe.append((abs(s[6] - r[6]), n, round(s[6] * 255, 1), round(r[6] * 255, 1)))
        write(out)
        err.sort(reverse=True)
        tot = sum(e[0] * e[2] for e in err) / max(1, sum(e[2] for e in err))
        print('weighted |dv|', round(tot, 4), 'worst', [(n, round(e, 3)) for e, n, _ in err[:12]])
        texe.sort(reverse=True); print('texture |hp| src/render (x255) worst', [(n, a, b) for _, n, a, b in texe[:10]])
