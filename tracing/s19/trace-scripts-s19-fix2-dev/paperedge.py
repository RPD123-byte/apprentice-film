# fit the paper's four straight edges (keyline -> paper transition) in a frame; print the corner intersections
import cv2,numpy as np,sys
def fit_edges(g, guess, thr=None):
    # guess: dict side -> (fixed coordinate range, approx line: function)
    b = cv2.GaussianBlur(g, (0, 0), 0.8)
    res = {}
    for side, (rng, approx, axis, inward) in guess.items():
        pts = []
        for s in rng:
            c0 = approx(s)
            if axis == 'x':   # scan along x at row y=s
                prof = b[int(s), int(c0) - 25:int(c0) + 26]
            else:
                prof = b[int(c0) - 25:int(c0) + 26, int(s)]
            if inward < 0: prof = prof[::-1]
            # paper level = median of the last 10, crossing at 60 % between min and paper
            pl = np.median(prof[-10:]); mn = prof[:30].min(); lv = mn + 0.6 * (pl - mn)
            i = np.argmax(prof > lv)
            if i == 0: continue
            f = (lv - prof[i - 1]) / (prof[i] - prof[i - 1] + 1e-9); pos = i - 1 + f
            off = (pos - 25) if inward > 0 else (25 - pos)
            pts.append((s, c0 + off))
        pts = np.array(pts)
        A = np.polyfit(pts[:, 0], pts[:, 1], 1)
        r = pts[:, 1] - np.polyval(A, pts[:, 0])
        k = np.abs(r) < 3 * np.median(np.abs(r)) + 0.5
        A = np.polyfit(pts[k, 0], pts[k, 1], 1)
        res[side] = (A, axis, float(np.abs(pts[k, 1] - np.polyval(A, pts[k, 0])).mean()), int(k.sum()))
    return res
def corners(res):
    # left/right: x = a*y + b ; top/bottom: y = a*x + b
    def inter(v, h):
        (a1, b1) = v; (a2, b2) = h
        # x = a1 y + b1, y = a2 x + b2
        y = (a2 * b1 + b2) / (1 - a1 * a2); x = a1 * y + b1; return [x, y]
    L, R, T, B = res['L'][0], res['R'][0], res['T'][0], res['B'][0]
    return [inter(L, T), inter(R, T), inter(R, B), inter(L, B)]
