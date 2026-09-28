# end-s27-tfix: affine correction of the laptop base in the turn (measurement -> numbers). For frame F: the render's edges
# inside the base's area (top-face quad from BASE_ALL at F/25, grown down by the front face and dilated) are matched to the
# source's edges by trimmed ICP (nearest source edge within 6 px, affine least squares, 25 iterations).
# Prints [t, a, b, c, d, e, f] (x' = a x + b y + c, y' = d x + e y + f) and the mean edge distance before -> after.
import cv2, numpy as np, sys, re, json
WORK = '/Users/computer/rootline/apprentice-film/snapshots/end-s27-tfix-work'
D = sys.argv[1]; FS = list(map(int, sys.argv[2].split(',')))
txt = open('/Users/computer/rootline/apprentice-film/src/shots/s27/data2.js').read()
BA = json.loads(re.search(r'export const BASE_ALL = (.*?);\n', txt, re.S).group(1))
def cr(T, t):
    n = len(T)
    if t <= T[0][0]: return np.array(T[0][1:])
    if t >= T[-1][0]: return np.array(T[-1][1:])
    i = 1
    while i < n - 1 and T[i][0] < t: i += 1
    p0, p1, p2, p3 = [np.array(T[max(0, min(n - 1, k))][1:]) for k in (i - 2, i - 1, i, i + 1)]
    u = (t - T[i - 1][0]) / (T[i][0] - T[i - 1][0])
    return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3)
def edges(im):
    g = cv2.GaussianBlur(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY), (0, 0), 1.8); return cv2.Canny(g, 30, 70)
out = []
for F in FS:
    t = F / 25; c = cr(BA, t).reshape(4, 2)
    m = np.zeros((946, 2206), np.uint8)
    q = np.vstack([c, c[:2][::-1] + [0, 0]]); cv2.fillPoly(m, [np.int32(c)], 1)
    cv2.fillPoly(m, [np.int32(np.vstack([c[0], c[1], c[1] + [0, 40], c[0] + [0, 40]]))], 1)
    m = cv2.dilate(m, np.ones((21, 21), np.uint8))
    s = cv2.imread(f'{WORK}/src/s{F}.png'); r = cv2.imread(f'{WORK}/{D}/r{F}.png')
    es = edges(s) * cv2.dilate(m, np.ones((15, 15), np.uint8)); er = edges(r) * m
    dt, lab = cv2.distanceTransformWithLabels((es == 0).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    zy, zx = np.nonzero(es)   # label k -> k-th zero pixel in raster order
    ys, xs = np.nonzero(er); P = np.stack([xs, ys], 1).astype(np.float64)
    A = np.eye(3)
    def cost(A):
        Q = P @ A[:2, :2].T + A[:2, 2]; xi = np.clip(np.round(Q[:, 0]).astype(int), 0, 2205); yi = np.clip(np.round(Q[:, 1]).astype(int), 0, 945)
        return np.minimum(dt[yi, xi], 8).mean(), Q, xi, yi
    c0 = cost(A)[0]
    for it in range(25):
        _, Q, xi, yi = cost(A)
        d = dt[yi, xi]; sel = d < 6
        L = lab[yi[sel], xi[sel]] - 1
        T = np.stack([zx[L], zy[L]], 1).astype(np.float64)
        X = np.hstack([P[sel], np.ones((sel.sum(), 1))])
        sol, *_ = np.linalg.lstsq(X, T, rcond=None)
        An = np.eye(3); An[:2, :] = sol.T
        # damp toward identity (keep it a small correction)
        A = 0.5 * A + 0.5 * An
    c1 = cost(A)[0]
    out.append([round(t, 2)] + [round(float(v), 5) for v in A[:2].ravel()])
    print(F, '%.2f' % t, 'dist %.2f -> %.2f' % (c0, c1), 'shift at base centre', np.round(A[:2, :2] @ c.mean(0) + A[:2, 2] - c.mean(0), 1).tolist(), flush=True)
print(json.dumps(out))
