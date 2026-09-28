# s28t: the mug's motion in the SOURCE (measurement): affine ECC of the mug (its 129.32 outline as the mask) from each
# key frame to every frame 129.32-130.08. -> mugtrack.json {key_t: {frame_t: [a,b,c,d,e,f]}} (x' = a x + b y + c, ...)
import sys, json, numpy as np, cv2
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28t-tools')
from m import frame, SRC
MUG = [[1775, 592], [1790, 587], [1842, 584], [1895, 587], [1909, 592], [1909, 612], [1928, 630], [1930, 660], [1925, 685],
       [1909, 698], [1909, 730], [1900, 738], [1842, 744], [1785, 738], [1775, 730]]
def gray(k):
    f = frame(SRC, k).astype(np.float32) / 255
    return cv2.GaussianBlur(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), (0, 0), 1.2)
def ecc(tpl, img, mask, init):
    w = init.astype(np.float32).copy()
    crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6)
    cc, w = cv2.findTransformECC(tpl, img, w, cv2.MOTION_AFFINE, crit, mask, 5)
    return cc, w
if __name__ == '__main__':
    K0 = 3233
    m0 = np.zeros((946, 2206), np.uint8); cv2.fillPoly(m0, [np.int32(MUG)], 255); m0 = cv2.dilate(m0, np.ones((7, 7), np.uint8))
    g0 = gray(K0)
    # chain: frame k from the 129.32 template, initialised with frame k-1's warp (findTransformECC warps img coords to tpl:
    # tpl(x) ~ img(W x) with W mapping template coords to image coords)
    W = np.array([[1, 0, 0], [0, 1, 0]], np.float32)
    res = {}
    for k in range(K0, 3254):
        g = gray(k)
        # initialise by multi-scale template matching of the mug's box (it moves ~40 px a frame), then refine (ECC)
        x0, y0, x1, y1 = 1770, 580, 1934, 748
        tpl = g0[y0:y1, x0:x1]; best = None
        for sc in np.arange(0.96, 1.20, 0.01):
            tt = cv2.resize(tpl, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
            cx, cy = W[0, 2] + x0 * W[0, 0], W[1, 2] + y0 * W[1, 1]
            sx0, sy0 = int(max(0, cx - 90)), int(max(0, cy - 60)); sx1, sy1 = int(min(2206, cx + 90 + tt.shape[1])), int(min(946, cy + 60 + tt.shape[0]))
            if sx1 - sx0 < tt.shape[1] + 2: continue
            r = cv2.matchTemplate(g[sy0:sy1, sx0:sx1], tt, cv2.TM_CCOEFF_NORMED)
            _, mv, _, ml = cv2.minMaxLoc(r)
            if best is None or mv > best[0]: best = (mv, sc, sx0 + ml[0], sy0 + ml[1])
        mv, sc, px, py = best
        Wi = np.array([[sc, 0, px - sc * x0], [0, sc, py - sc * y0]], np.float32)
        try: cc, W = ecc(g0, g, m0, Wi)
        except cv2.error: cc, W = mv, Wi
        res[f"{k/25:.2f}"] = [float(v) for v in W.reshape(-1)]
        print(f"{k/25:.2f} cc {cc:.4f} W {np.round(W,4).tolist()}", flush=True)
    json.dump(res, open('/Users/computer/rootline/apprentice-film/snapshots/s28t-tools/mugtrack.json', 'w'))
    # check sheet: the 129.32 outline carried to each frame
    ims = []
    for k in range(K0, 3254, 2):
        f = frame(SRC, k).copy(); Wk = np.array(res[f"{k/25:.2f}"]).reshape(2, 3)
        P = (np.c_[np.array(MUG, float), np.ones(len(MUG))] @ Wk.T)
        cv2.polylines(f, [np.int32(P)], True, (0, 255, 0), 1)
        cx, cy = P.mean(0).astype(int); x0 = max(0, cx - 130); y0 = max(0, cy - 110)
        c = f[y0:y0 + 220, x0:x0 + 260]; c = cv2.copyMakeBorder(c, 0, 220 - c.shape[0], 0, 260 - c.shape[1], cv2.BORDER_CONSTANT)
        cv2.putText(c, f"{k/25:.2f}", (4, 16), 0, 0.5, (0, 0, 255), 1); ims.append(c)
    while len(ims) % 4: ims.append(np.zeros_like(ims[0]))
    cv2.imwrite('/Users/computer/rootline/apprentice-film/snapshots/s28t-work/mugtrack.jpg', np.vstack([np.hstack(ims[i:i + 4]) for i in range(0, len(ims), 4)]))
