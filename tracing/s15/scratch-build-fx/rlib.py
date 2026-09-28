import cv2, numpy as np, json, re, os
FX = os.path.dirname(os.path.abspath(__file__))
FLOW = FX + '/../flow2'
HOLDS = {1017, 1023, 1042, 1048, 1067, 1072, 1092, 1097, 1117, 1121, 1142}
W, H = 2206, 946
txt = open('/Users/computer/rootline/apprentice-film/src/shots/s15/track.js').read()
OWL = json.loads('[' + re.search(r'OWL = \[(.*?)\];', txt, re.S).group(1) + ']')
owl = {int(round(r[0] * 25)): r for r in OWL}
def src(f, gray=True):
    return cv2.imread(f'{FX}/../src/f{f}.png', 0 if gray else 1)
def owlmask(f, grow=1.0):
    """True where the owl is (bbox-ish ellipse)"""
    m = np.zeros((H, W), np.uint8)
    r = owl.get(f)
    if r:
        _, cx, cy, w, h = r
        cv2.ellipse(m, (int(cx), int(cy + 0.1 * h)), (int(0.62 * w * grow), int(0.75 * h * grow)), 0, 0, 360, 1, -1)
        # headphones / head top and feet
        cv2.ellipse(m, (int(cx), int(cy - 0.35 * h)), (int(0.35 * w * grow), int(0.5 * h * grow)), 0, 0, 360, 1, -1)
        cv2.ellipse(m, (int(cx), int(cy + 0.6 * h)), (int(0.3 * w * grow), int(0.35 * h * grow)), 0, 0, 360, 1, -1)
    return m.astype(bool)
def nxt(f, d):
    g = f + d
    while g in HOLDS: g += d
    return g
_fl = {}
def flow(a, b):
    """forward flow a->b at half res (full-res px units), fb error"""
    k = (a, b)
    if k in _fl: return _fl[k]
    if os.path.exists(f'{FLOW}/fl_{a}_{b}.npz'):
        d = np.load(f'{FLOW}/fl_{a}_{b}.npz'); fw = d['fw'].astype(np.float32); bw = d['bw'].astype(np.float32)
    elif os.path.exists(f'{FLOW}/fl_{b}_{a}.npz'):
        d = np.load(f'{FLOW}/fl_{b}_{a}.npz'); fw = d['bw'].astype(np.float32); bw = d['fw'].astype(np.float32)
    else:
        return None
    _fl[k] = (fw, bw)
    return _fl[k]
def poly_mask(pts, shape=(H, W)):
    m = np.zeros(shape, np.uint8)
    cv2.fillPoly(m, [np.round(np.array(pts)).astype(np.int32)], 1)
    return m.astype(bool)
def homog_step(pts, a, b, excl=None, shrink=0.12):
    """map polygon pts from frame a to b with a homography fitted to flow inside the polygon"""
    fl = flow(a, b)
    if fl is None: return None, 0
    fw, bw = fl
    P = np.array(pts, np.float64); c = P.mean(0)
    Ps = c + (P - c) * (1 - shrink)
    m = poly_mask(Ps)
    m &= ~owlmask(a, 1.15)
    if excl is not None: m &= ~excl
    m2 = m[::2, ::2]
    ys, xs = np.nonzero(m2)
    if len(xs) < 60: return None, len(xs)
    if len(xs) > 6000:
        idx = np.linspace(0, len(xs) - 1, 6000).astype(int); xs = xs[idx]; ys = ys[idx]
    f = fw[ys, xs]
    x2 = xs * 2 + f[:, 0]; y2 = ys * 2 + f[:, 1]
    ok = (x2 > 2) & (x2 < W - 3) & (y2 > 2) & (y2 < H - 3)
    xi = np.clip(np.round(x2 / 2).astype(int), 0, bw.shape[1] - 1); yi = np.clip(np.round(y2 / 2).astype(int), 0, bw.shape[0] - 1)
    bk = bw[yi, xi]
    fb = np.hypot(f[:, 0] + bk[:, 0], f[:, 1] + bk[:, 1])
    ok &= fb < 2.5
    if ok.sum() < 40: return None, int(ok.sum())
    src_ = np.stack([xs * 2.0, ys * 2.0], 1)[ok]; dst = np.stack([x2, y2], 1)[ok]
    Hm, inl = cv2.findHomography(src_, dst, cv2.RANSAC, 4.0)
    if Hm is None: return None, 0
    q = cv2.perspectiveTransform(np.array([pts], np.float64), Hm)[0]
    return q.tolist(), int(inl.sum())
