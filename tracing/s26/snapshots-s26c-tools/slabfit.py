import cv2, numpy as np, json
M = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas'
W, H = 2206, 946; Q = 4
def maskF(F):
    s = cv2.imread(f'{M}/src/{F}.png'); p = cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s26c-out/pagesE/r{F}.png')
    lab = lambda im: cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32) / 255, (0, 0), 6), cv2.COLOR_BGR2LAB)
    dE = np.sqrt(((lab(s) - lab(p)) ** 2).sum(2))
    hsv = cv2.cvtColor(cv2.GaussianBlur(s, (0, 0), 3), cv2.COLOR_BGR2HSV)
    g = cv2.cvtColor(s, cv2.COLOR_BGR2GRAY).astype(np.float32)
    hf = cv2.GaussianBlur(np.abs(g - cv2.GaussianBlur(g, (0, 0), 2)), (0, 0), 8)
    m = ((dE > 14) & (hsv[..., 1] < 90) & (hf < 4.0)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((11, 11), np.uint8)); m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((31, 31), np.uint8))
    n, labm, st, cen = cv2.connectedComponentsWithStats(m)
    # keep components touching the lower-left..right path of the slab (exclude the owl region in 2841-2843 / 2854+)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i, 4] > 30000: keep[labm == i] = 1
    cs, _ = cv2.findContours(keep, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    filled = np.zeros_like(keep)
    for c in cs: cv2.fillPoly(filled, [cv2.convexHull(c)], 1)
    return cv2.resize(filled, (W // Q, H // Q), interpolation=cv2.INTER_NEAREST)
def rectMask(p):
    cx, cy, w, h, th = p
    box = cv2.boxPoints(((cx / Q, cy / Q), (w / Q, h / Q), th))
    m = np.zeros((H // Q, W // Q), np.uint8); cv2.fillPoly(m, [np.round(box).astype(np.int32)], 1); return m
def iou(a, b): return (a & b).sum() / max(1, (a | b).sum())
res = {}; prev = None
for F in range(2844, 2854):
    m = maskF(F)
    ys, xs = np.nonzero(m)
    r = cv2.minAreaRect(np.stack([xs, ys], 1).astype(np.float32) * Q)
    p = np.array([r[0][0], r[0][1], max(r[1]), min(r[1]), -25.0])
    if prev is not None: p = prev.copy(); p[0] += 150; p[1] -= 110
    best = iou(rectMask(p), m); st = np.array([40, 40, 60, 60, 3.0])
    for it in range(7):
        imp = True
        while imp:
            imp = False
            for k in range(5):
                for sg in (1, -1):
                    q = p.copy(); q[k] += sg * st[k]; v = iou(rectMask(q), m)
                    if v > best + 1e-4: best, p, imp = v, q, True
        st /= 2
    res[F] = [float(v) for v in p] + [float(best)]
    prev = p
    print(F, [round(v, 1) for v in p], round(best, 3))
json.dump(res, open(f'{M}/slabfit.json', 'w'))
