# boil.py DIR T0 T1 x0 y0 x1 y1 : motion-compensated frame-to-frame change, render vs source. For each consecutive pair
# of frames (f-1, f): the source's motion is measured on the box of frame f (phase correlation, then an ECC affine of the
# box of source f against source f-1); the same warp takes both images' f-1 onto f, and the mean |warped(f-1) - f|
# (blurred σ1) is taken inside the box (20 px inner margin).
import cv2, sys, numpy as np, os
SRC = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
d = sys.argv[1]; t0, t1 = float(sys.argv[2]), float(sys.argv[3]); x0, y0, x1, y1 = map(int, sys.argv[4:8])
def ld(p): return cv2.GaussianBlur(cv2.imread(p, 0).astype(np.float32), (0, 0), 1)
f0, f1 = round(t0 * 25), round(t1 * 25); tot = []
for f in range(f0 + 1, f1 + 1):
    ra, rb = f'{d}/r-{(f-1)/25:.2f}.png', f'{d}/r-{f/25:.2f}.png'
    if not (os.path.exists(ra) and os.path.exists(rb)): continue
    A, B = ld(ra), ld(rb); SA, SB = ld(f'{SRC}/{f-1}.png'), ld(f'{SRC}/{f}.png')
    s = 0.5
    sa = cv2.resize(SA, None, fx=s, fy=s); sb = cv2.resize(SB, None, fx=s, fy=s)
    bx = (int(x0*s), int(y0*s), int(x1*s), int(y1*s))
    tpl = sb[bx[1]:bx[3], bx[0]:bx[2]].copy()
    # init: phase correlation of the box against the same box in f-1
    (dx, dy), _ = cv2.phaseCorrelate(tpl, sa[bx[1]:bx[3], bx[0]:bx[2]].copy())
    w = np.array([[1, 0, bx[0] + dx], [0, 1, bx[1] + dy]], np.float32)
    try:
        _, w = cv2.findTransformECC(tpl, sa, w, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), None, 5)
    except cv2.error:
        pass
    # w: box px of f (scale s) -> px of f-1 (scale s). Full-res: X_{f-1} = L X_f + t, over the box of f
    L = w[:, :2]; t = w[:, 2] / s - L @ np.array([x0, y0], np.float32) + 0  # map full-res box coords
    Wf = np.hstack([L, (w[:, 2] / s - L @ np.array([x0, y0]))[:, None] + (L @ np.array([x0, y0]) - np.array([0, 0]))[:, None] * 0])
    # frame px of f (x) -> frame px of f-1: L (x - (x0, y0)) + w[:, 2] / s
    M = np.hstack([L, (w[:, 2] / s - L @ np.array([x0, y0], np.float32))[:, None]]).astype(np.float32)
    wa = cv2.warpAffine(A, M, (A.shape[1], A.shape[0]), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)
    wsa = cv2.warpAffine(SA, M, (A.shape[1], A.shape[0]), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)
    m = 20; sl = (slice(y0 + m, y1 - m), slice(x0 + m, x1 - m))
    r = np.abs(wa - B)[sl].mean(); sv = np.abs(wsa - SB)[sl].mean(); tot.append((r, sv))
    print(f'{(f-1)/25:.2f}->{f/25:.2f} render {r:5.2f} source {sv:5.2f} excess {r-sv:+.2f}  (shift {M[0,2]:+.0f},{M[1,2]:+.0f})')
if tot:
    v = np.array(tot); print(f'MEAN render {v[:,0].mean():.2f} source {v[:,1].mean():.2f} excess {v[:,0].mean()-v[:,1].mean():+.2f}')
