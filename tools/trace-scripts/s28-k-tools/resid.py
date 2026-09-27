# Measure per-vertex screen-space residuals of s28's key re-projection during the orbit.
# For each orbit frame t and each key the shot draws at t: the true position of each key-mesh vertex at t (dense optical
# flow on the source, key frame -> frame t, forward/backward checked, only where that key's layer is visible at both
# times) minus the 3D re-projection's position. The residual field is smoothed/filled on the vertex grid.
# Output: resid.json {key name: {frame t: [nu2, nv2, list of ints (0.5 px), dx then dy]}} on every 2nd vertex.
import sys, json; sys.path.insert(0, '.')
from geo import *

LOCK = 131.36
ROOM_T = [129.32, 129.52, 129.72, 129.92, 130.12, 130.32, 130.52, 130.72, 130.92, 131.12, 131.60, 132.80, 134.20, 135.60]
ROOM_N = ['room12932', 'room12952', 'room12972', 'room12992', 'room13012', 'room13032', 'room13052', 'room13072', 'room13092', 'room13112', 'room13160', 'room13280', 'room13420', 'room13560']
FIG_T = [129.32, 129.52, 129.72, 129.92, 130.12, 130.32, 130.52, 130.72, 130.92, 131.12, 131.44]
FIG_N = ['fig12932', 'fig12952', 'fig12972', 'fig12992', 'fig13012', 'fig13032', 'fig13052', 'fig13072', 'fig13092', 'fig13112', 'lock13144']
FIG_G = FIG_N[:-1] + ['fig13144']

def nearest2(t, times):
    o = sorted(range(len(times)), key=lambda i: (abs(t - times[i]), i))
    return o[0], o[1]

def gray(k):
    f = frame(k)
    return cv2.GaussianBlur(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), (0, 0), 1.0)

dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
_fc = {}
def flows(ka, kb):
    if (ka, kb) not in _fc:
        a, b = gray(ka), gray(kb)
        _fc[(ka, kb)] = (dis.calc(a, b, None), dis.calc(b, a, None))
    return _fc[(ka, kb)]

def lidmask(t, grow):
    m = np.zeros((H, W), np.uint8); q = lidQuad(t).copy(); q[2:, 1] += 300
    cv2.fillPoly(m, [np.int32(q)], 255)
    return cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1, 2 * grow + 1)))

_keys = {}
def key(name):
    if name not in _keys: _keys[name] = loadKey(name)
    return _keys[name]

def figsil(t, grow):
    i, _ = nearest2(t, FIG_T)
    m = ringsMask(key(FIG_N[i])['sil'])
    return cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1, 2 * grow + 1)))

def blurc(a, s):
    return cv2.GaussianBlur(a, (0, 0), s, borderType=cv2.BORDER_CONSTANT)

def nconv(val, w, s):
    """normalized convolution on a grid; val (n,m,2), w (n,m)."""
    num = np.stack([blurc((val[..., c] * w).astype(np.float32), s) for c in range(2)], -1)
    den = blurc(w.astype(np.float32), s)
    return num / np.maximum(den, 1e-6)[..., None], den

def inverse_map(G, P, step_s=4):
    """backward map for the forward mesh map key(u,v) -> P (nv,nu,2): for screen pixels on a step_s grid, the key
    coordinate that lands there (fixed-point iteration on the bilinear forward map)."""
    u0, v0, st, nu, nv = G['u0'], G['v0'], G['step'], G['nu'], G['nv']
    Pg = P.reshape(nv, nu, 2).astype(np.float32)
    ys, xs = np.mgrid[0:H:step_s, 0:W:step_s].astype(np.float32)
    k = np.stack([xs, ys], -1)
    def fwd(k):
        gi = (k[..., 0] - u0) / st; gj = (k[..., 1] - v0) / st
        return np.stack([cv2.remap(Pg[..., c], gi, gj, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE) for c in range(2)], -1)
    # initial guess: subtract the displacement at the pixel itself
    k = k - (fwd(k) - k)
    for _ in range(12):
        e = np.stack([xs, ys], -1) - fwd(k)
        k = k + e
    err = np.linalg.norm(np.stack([xs, ys], -1) - fwd(k), axis=2)
    return k, err

def residual(layer, name, gname, tk, t):
    G = DEPTH[gname]
    uv, X = keyVerts(G, tk)
    p3, _ = project(camAt(frameT(t)), X)
    nu, nv = G['nu'], G['nv']
    ka, kb = round(tk * 25), round(t * 25)
    if layer == 'fig':
        src = cv2.erode(ringsMask(key(name)['sil']), np.ones((17, 17), np.uint8))
        src[lidmask(tk, 22) > 0] = 0
        dst_bad = lidmask(t, 22)
    else:
        src = 255 - cv2.dilate(ringsMask(key(name)['hide']), np.ones((41, 41), np.uint8))
        src[lidmask(tk, 22) > 0] = 0
        dst_bad = np.maximum(lidmask(t, 22), figsil(t, 30))
    # warp the key's source frame to frame t with the 3D prediction, then measure the (small) remaining flow
    kmap, ierr = inverse_map(G, p3, 2)
    kx = cv2.resize(kmap[..., 0], (W, H), interpolation=cv2.INTER_LINEAR)
    ky = cv2.resize(kmap[..., 1], (W, H), interpolation=cv2.INTER_LINEAR)
    ie = cv2.resize(ierr, (W, H), interpolation=cv2.INTER_NEAREST)
    Ik = gray(ka); It = gray(kb)
    Iw = cv2.remap(Ik, kx, ky, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    mw = cv2.remap(src, kx, ky, cv2.INTER_NEAREST, borderValue=0)
    mw[(ie > 1.0) | (kx < 0) | (ky < 0) | (kx > W - 1) | (ky > H - 1)] = 0
    # sparse KLT tracks on the (predicted-)warped key frame -> frame t, forward/backward checked
    pts = cv2.goodFeaturesToTrack(Iw, 8000, 0.004, 5, mask=(mw > 0).astype(np.uint8) * 255, blockSize=7)
    if pts is None: pts = np.zeros((0, 1, 2), np.float32)
    lk = dict(winSize=(25, 25), maxLevel=3, criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 40, 0.01))
    p1, st1, _ = cv2.calcOpticalFlowPyrLK(Iw, It, pts, None, **lk)
    p0b, st2, _ = cv2.calcOpticalFlowPyrLK(It, Iw, p1, None, **lk)
    p0 = pts.reshape(-1, 2); p1 = p1.reshape(-1, 2); p0b = p0b.reshape(-1, 2)
    good = (st1.ravel() == 1) & (st2.ravel() == 1) & (np.linalg.norm(p0 - p0b, axis=1) < 0.6)
    q = np.round(p1).astype(int)
    inb = (q[:, 0] >= 0) & (q[:, 0] < W) & (q[:, 1] >= 0) & (q[:, 1] < H)
    good &= inb
    good[good] &= dst_bad[q[good, 1], q[good, 0]] == 0
    P0 = p0[good]; D = p1[good] - p0[good]
    # robust: drop tracks that disagree with their neighbours (median of 12 nearest)
    if len(P0) > 20:
        from scipy.spatial import cKDTree
        tr = cKDTree(P0); _, nn = tr.query(P0, 13)
        med = np.median(D[nn[:, 1:]], axis=1)
        keep = np.linalg.norm(D - med, axis=1) < np.maximum(1.5, 0.25 * np.linalg.norm(med, axis=1))
        P0, D = P0[keep], D[keep]
    # screen-space kernel regression of the residual, sampled at each vertex's predicted position
    sc = 4
    acc = np.zeros((H // sc + 1, W // sc + 1, 3), np.float32)
    qi = np.round(P0 / sc).astype(int)
    np.add.at(acc, (qi[:, 1], qi[:, 0]), np.concatenate([D, np.ones((len(D), 1))], 1))
    def field(sig):
        b = np.stack([blurc(acc[..., c], sig / sc) for c in range(3)], -1)
        return b[..., :2] / np.maximum(b[..., 2:], 1e-6), b[..., 2]
    ps = p3 / sc
    def samp(img):
        return np.stack([cv2.remap(img[..., c].astype(np.float32), ps[:, 0].astype(np.float32).reshape(1, -1), ps[:, 1].astype(np.float32).reshape(1, -1), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE).ravel() for c in range(img.shape[2])], -1)
    sig1 = 18 if layer == 'fig' else 28
    F1, C1 = field(sig1); F2, C2 = field(sig1 * 3); F3, C3 = field(sig1 * 10)
    f1, c1 = samp(F1), samp(C1[..., None])[:, 0]
    f2, c2 = samp(F2), samp(C2[..., None])[:, 0]
    f3, c3 = samp(F3), samp(C3[..., None])[:, 0]
    # weights: support in tracks per kernel area
    a1 = np.clip(c1 * (2 * np.pi * (sig1 / sc) ** 2) / 4.0, 0, 1)[:, None]
    a2 = np.clip(c2 * (2 * np.pi * (3 * sig1 / sc) ** 2) / 4.0, 0, 1)[:, None]
    a3 = np.clip(c3 * (2 * np.pi * (10 * sig1 / sc) ** 2) / 4.0, 0, 1)[:, None]
    far = a3 * f3
    mid = a2 * f2 + (1 - a2) * far
    out = (a1 * f1 + (1 - a1) * mid).reshape(nv, nu, 2)
    stats = dict(n=int(len(D)), med=float(np.median(np.linalg.norm(D, axis=1))) if len(D) else 0, fit=0.0)
    return out, stats

def main():
    res = {}
    frames = [round(129.32 + 0.04 * i, 2) for i in range(0, 54)]     # 129.32 .. 131.44
    for t in frames:
        todo = []
        # room: the two nearest keys (orbit and the first locked key)
        if t <= LOCK + 0.1:
            a, b = nearest2(t, ROOM_T)
            for i in (a, b):
                if ROOM_T[i] <= 131.60: todo.append(('room', ROOM_N[i], 'room' + ROOM_N[i][4:] if ROOM_T[i] < 131.5 else 'room13160', ROOM_T[i]))
        a, b = nearest2(t, FIG_T)
        for i in (a, b): todo.append(('fig', FIG_N[i], FIG_G[i], FIG_T[i]))
        for layer, name, gname, tk in todo:
            if abs(tk - t) < 1e-6: continue
            if tk >= LOCK and t >= LOCK: continue            # both locked: identity
            out, st = residual(layer, name, gname, tk, t)
            G = DEPTH[gname]
            sub = out[::2, ::2]
            q = np.clip(np.round(sub * 2), -127, 127).astype(np.int8)
            res.setdefault(name, {})['%.2f' % t] = [int(sub.shape[1]), int(sub.shape[0]), q[..., 0].ravel().tolist() + q[..., 1].ravel().tolist()]
            mx = float(np.abs(sub).max())
            print(f"{t:.2f} {name} from {tk:.2f}: n={st['n']} |r| med {st['med']:.2f} fit-err med {st['fit']:.2f} max {mx:.1f}", flush=True)
    json.dump(res, open('resid.json', 'w'))

if __name__ == '__main__':
    main()
