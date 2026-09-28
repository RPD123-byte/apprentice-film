#!/usr/bin/env python3
# Re-measure what each traced D-ring cell (ringcells.json, frame 2818) shows: the similarity stage->frame
# (p_f = s R(th) p_st + t) of the A-beat page, by masked NCC template matching (coarse half-res grid over s, th; then
# full-res refinement). Measurement only; the render draws OUR page under the found transform. Scratch.
import cv2, numpy as np, json, sys
from multiprocessing import Pool
M = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas'
F = int(sys.argv[1]) if len(sys.argv) > 1 else 2818
REF = sys.argv[2] if len(sys.argv) > 2 else 'stageA.png'
src = cv2.imread(f'{M}/src/{F}.png'); stage = cv2.imread(f'{M}/{REF}')
H, W = src.shape[:2]
def grey(im, sig): return cv2.GaussianBlur(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), sig)
cells = json.load(open(f'{M}/ringcells.json'))
segs = json.load(open(f'{M}/ringsegs.json'))
bad = np.zeros((H, W), np.uint8)
for i in range(0, len(segs), 4): cv2.line(bad, (int(segs[i]), int(segs[i+1])), (int(segs[i+2]), int(segs[i+3])), 255, 7)
owl = np.fromfile(f'/Users/computer/rootline/apprentice-film/snapshots/s26b-meas/fit/m/{F}.bin', np.uint8).reshape(473, 1103)
owl = cv2.dilate(cv2.resize(owl, (W, H)), np.ones((15, 15), np.uint8)); bad[owl > 100] = 255
SG = {0.5: (cv2.resize(grey(src, 1.0), (W // 2, H // 2), interpolation=cv2.INTER_AREA), cv2.resize(grey(stage, 1.0), (W // 2, H // 2), interpolation=cv2.INTER_AREA)),
      1.0: (grey(src, 1.2), grey(stage, 1.2))}
def tmpl(k, poly, s, th, sc):
    fr, st = SG[sc]
    P = np.array(poly, np.float32).reshape(-1, 2)
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [P.astype(np.int32)], 255)
    m = cv2.erode(m, np.ones((7, 7), np.uint8)); m[bad > 0] = 0
    if sc != 1.0: m = cv2.resize(m, (W // 2, H // 2), interpolation=cv2.INTER_NEAREST)
    c = P.mean(0) * sc
    x0, y0 = P.min(0) * sc; x1, y1 = P.max(0) * sc
    R = np.hypot(x1 - x0, y1 - y0) / 2 / s + 4
    sz = int(np.ceil(2 * R))
    ct, sn = np.cos(th), np.sin(th)
    # template coords q = (1/s) R^T (p - c) + (R, R)
    A = np.array([[ct, sn, 0], [-sn, ct, 0]], np.float32) / s
    A[:, 2] = np.array([R, R]) - A[:, :2] @ c
    T = cv2.warpAffine(fr, A, (sz, sz), flags=cv2.INTER_LINEAR)
    Tm = cv2.warpAffine(m, A, (sz, sz), flags=cv2.INTER_NEAREST)
    return T, Tm, (R, R), c
def nccm(I, T, Tm, smin=6.0):
    # masked NCC with a variance floor (flat image windows score low instead of blowing up)
    m = (Tm > 0).astype(np.float32); n = m.sum()
    Tv = T[m > 0]; Tp = (T - Tv.mean()) * m
    A = cv2.matchTemplate(I, Tp, cv2.TM_CCORR)
    S1 = cv2.matchTemplate(I, m, cv2.TM_CCORR); S2 = cv2.matchTemplate(I * I, m, cv2.TM_CCORR)
    vI = np.maximum(S2 - S1 * S1 / n, n * smin * smin)
    return A / np.sqrt((Tp * Tp).sum() * vI + 1e-6)
def score(k, poly, s, th, sc, win=None):
    fr, st = SG[sc]
    T, Tm, o, c = tmpl(k, poly, s, th, sc)
    if Tm.sum() < 255 * 30: return None
    if T[Tm > 0].std() < 3: return None
    if win is None:
        S, X0, Y0 = st, 0, 0
    else:
        (cx, cy), r = win
        X0 = int(max(0, cx - o[0] - r)); Y0 = int(max(0, cy - o[1] - r))
        X1 = int(min(st.shape[1], cx - o[0] + r + T.shape[1])); Y1 = int(min(st.shape[0], cy - o[1] + r + T.shape[0]))
        S = st[Y0:Y1, X0:X1]
    if S.shape[0] < T.shape[0] or S.shape[1] < T.shape[1]: return None
    res = nccm(S, T, Tm)
    _, mx, _, loc = cv2.minMaxLoc(res)
    q = np.array([loc[0] + X0 + o[0], loc[1] + Y0 + o[1]])   # stage point (at sc) matching the cell centre
    return mx, q, c
def solve(k):
    q0 = cells[k]; poly = q0['p']
    if q0['lab'] == 1: return (k, None)
    best = (-2, None)
    for s in np.arange(1.35, 2.75, 0.06):
        for th in np.radians(np.arange(-36, 37, 3)):
            r = score(k, poly, s, th, 0.5)
            if r and r[0] > best[0]: best = (r[0], (s, th, r[1] / 0.5))
    if best[1] is None: return (k, None)
    s0, th0, q = best[1]
    fine = (-2, None)
    for s in np.arange(s0 - 0.05, s0 + 0.051, 0.0125):
        for th in np.radians(np.arange(np.degrees(th0) - 2.5, np.degrees(th0) + 2.51, 0.625)):
            r = score(k, poly, s, th, 1.0, win=(q, 14))
            if r and r[0] > fine[0]: fine = (r[0], (s, th, r[1], r[2]))
    if fine[1] is None: return (k, (best[0], None))
    s, th, qs, c = fine[1]
    ct, sn = np.cos(th), np.sin(th)
    a, b, d, e = s * ct, -s * sn, s * sn, s * ct
    tx = c[0] - (a * qs[0] + b * qs[1]); ty = c[1] - (d * qs[0] + e * qs[1])
    return (k, (float(best[0]), float(fine[0]), [a, b, float(tx), d, e, float(ty)], float(s), float(np.degrees(th))))
if __name__ == '__main__':
    with Pool(6) as p: out = p.map(solve, range(len(cells)))
    res = {k: v for k, v in out}
    json.dump(res, open(f'{M}/ringmatch_{F}_{REF.split(".")[0]}.json', 'w'))
    for k, v in sorted(res.items()):
        if v and v[1] is not None: print(k, cells[k]['lab'], 'coarse %.2f fine %.2f s %.3f th %.1f' % (v[0], v[1], v[3], v[4]), 'old', [round(x, 2) for x in cells[k]['M']])
        else: print(k, cells[k]['lab'], v)
