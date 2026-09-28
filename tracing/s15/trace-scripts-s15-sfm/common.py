import cv2, numpy as np, re, json
SRC = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
FLOW = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/flow2'
HOLDS = {1023, 1042, 1048, 1067, 1072, 1092, 1097, 1117, 1121, 1142}
FRAMES = [i for i in range(1016, 1142) if i not in HOLDS]
W, H = 2206, 946
txt = open('/Users/computer/rootline/apprentice-film/src/shots/s15/track.js').read()
OWL = json.loads('[' + re.search(r'OWL = \[(.*?)\];', txt, re.S).group(1) + ']')
owl = {int(round(r[0] * 25)): r for r in OWL}
def owlmask(i, grow=1.0):
    m = np.ones((H, W), bool)
    r = owl.get(i)
    if r:
        _, cx, cy, w, h = r
        x0, x1 = int(cx - 0.75 * w * grow), int(cx + 0.75 * w * grow); y0, y1 = int(cy - 0.95 * h * grow), int(cy + 1.1 * h * grow)
        m[max(0, y0):max(0, y1), max(0, x0):max(0, x1)] = False
    return m
def K(f): return np.array([[f, 0, W / 2], [0, f, H / 2], [0, 0, 1.0]])
def corr(a, b, step=8, fbth=1.0):
    d = np.load(f'{FLOW}/fl_{a}_{b}.npz'); fw = d['fw'].astype(np.float32); bw = d['bw'].astype(np.float32)
    h, w = fw.shape[:2]
    ys, xs = np.mgrid[2:h - 2:step // 2, 2:w - 2:step // 2]
    ys = ys.ravel(); xs = xs.ravel()
    f = fw[ys, xs]
    x2 = xs + f[:, 0] / 2; y2 = ys + f[:, 1] / 2   # half-res flow is in full-res px (computed at full res, subsampled)
    ok = (x2 >= 0) & (x2 < w - 1) & (y2 >= 0) & (y2 < h - 1)
    xi = np.clip(np.round(x2).astype(int), 0, w - 1); yi = np.clip(np.round(y2).astype(int), 0, h - 1)
    back = bw[yi, xi]
    fb = np.hypot(f[:, 0] + back[:, 0], f[:, 1] + back[:, 1])
    ok &= fb < fbth
    P = np.stack([xs * 2.0, ys * 2.0], 1); Q = P + f
    ma = owlmask(a); mb = owlmask(b)
    ok &= ma[P[:, 1].astype(int).clip(0, H - 1), P[:, 0].astype(int).clip(0, W - 1)]
    ok &= mb[Q[:, 1].astype(int).clip(0, H - 1), Q[:, 0].astype(int).clip(0, W - 1)]
    ok &= (Q[:, 0] > 4) & (Q[:, 0] < W - 4) & (Q[:, 1] > 4) & (Q[:, 1] < H - 4)
    return P[ok], Q[ok], ok.mean()
