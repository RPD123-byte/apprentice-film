#!/usr/bin/env python3
# ecc_all.py silC.json silD.json feet.json out.json — per-frame placement of every part layer, measured on the source:
# an affine ECC fit (image-gradient alignment, 1.5 px pre-blur, coarse-to-fine) of each part's region of the reference
# drawing (pose C = median of frames 891-898; the front head = median of 901-902) onto every frame 884-922.
# Output per frame and part: the 2x3 matrix mapping reference frame px -> frame px, and the correlation.
import cv2, numpy as np, json, sys
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s13-k-src/'
silc, sild, feetp, outp = sys.argv[1:5]
C = cv2.imread(SRC + 'C_med.png', 0).astype(np.float32); D = cv2.imread(SRC + 'D_mean.png', 0).astype(np.float32)
H, W = C.shape
SC = json.load(open(silc)); SD = json.load(open(sild)); FT = json.load(open(feetp))
def mask(rings, er=5):
    m = np.zeros((H, W), np.uint8)
    for r in rings: m ^= cv2.fillPoly(np.zeros((H, W), np.uint8), [np.array(r, np.int32)], 1)
    return cv2.erode(m, np.ones((er, er), np.uint8)) if er else m
MASK = {k: mask(SC[k]) for k in ('head', 'wing', 'body', 'tail', 'nub')}
MASK['feet'] = mask(FT['lit'], 3); MASK['headF'] = mask(SD['headF'])
# while the front head is up, the chest under it changes: fit the body on its lower part only
MASK['bodyLow'] = MASK['body'].copy(); MASK['bodyLow'][:580] = 0
def ecc(ref, img, m, W0):
    ys, xs = np.nonzero(m); x0, x1, y0, y1 = max(0, xs.min() - 80), min(W, xs.max() + 80), max(0, ys.min() - 80), min(H, ys.max() + 80)
    R = cv2.GaussianBlur(ref, (0, 0), 1.5)[y0:y1, x0:x1]; I = cv2.GaussianBlur(img, (0, 0), 1.5)[y0:y1, x0:x1]
    o = np.array([x0, y0], np.float32); A = W0[:, :2]
    Wc = np.hstack([A, (A @ o + W0[:, 2] - o)[:, None]]).astype(np.float32)
    crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6)
    try: cc, Wc = cv2.findTransformECC(R, I, Wc, cv2.MOTION_AFFINE, crit, m[y0:y1, x0:x1], 5)
    except cv2.error: return None, 0
    A = Wc[:, :2]; Wf = np.hstack([A, (Wc[:, 2] + o - A @ o)[:, None]]).astype(np.float32)
    return Wf, cc
I2 = np.array([[1, 0, 0], [0, 1, 0]], np.float32)
def sim(dx, dy, rd, s, c):
    a = np.radians(rd); co, sn = np.cos(a) * s, np.sin(a) * s
    return np.array([[co, -sn, c[0] + dx - (co * c[0] - sn * c[1])], [sn, co, c[1] + dy - (sn * c[0] + co * c[1])]], np.float32)
CEN = {'tail': [1715, 783], 'head': [1190, 270], 'wing': [1860, 485], 'body': [1250, 650], 'feet': [1400, 883], 'nub': [905, 455], 'headF': [1190, 270]}
# starting guesses (the first pass's ORB numbers) for the big moves
INIT = {884: {'head': (-1, -32.8, .33, 1), 'wing': (.6, 26.9, 10.5, 1), 'body': (4.7, -26.4, .83, 1.036), 'feet': (-2.3, -15.1, .66, 1), 'tail': (-2.1, -9.5, 1.26, 1)},
        886: {'head': (1.5, -29.8, .49, 1), 'wing': (-4, -32, -2, 1.01), 'body': (5.7, -22.1, 1.26, 1.037), 'feet': (-2.4, -10.3, .7, 1), 'tail': (-2.3, 1, 3.38, 1)}}
out = {}; prev = {}
for f in range(884, 923):
    img = cv2.imread(SRC + 'f%04d.png' % f, 0).astype(np.float32)
    row = {}
    parts = ['wing', 'body', 'tail', 'feet'] + (['headF'] if 901 <= f <= 911 else ['head'] if not (901 <= f <= 912) else []) + (['nub'] if f >= 888 else [])
    for k in parts:
        W0 = prev.get(k, I2)
        if f in INIT and k in INIT[f]: W0 = sim(*INIT[f][k], CEN[k])
        if f == 901 and k == 'headF': W0 = I2
        ref = D if k == 'headF' else C
        mk = MASK['bodyLow'] if (k == 'body' and 901 <= f <= 912) else MASK[k]
        Wf, cc = ecc(ref, img, mk, W0)
        if Wf is None or cc < 0.6:
            Wf2, cc2 = ecc(ref, img, mk, I2)
            if Wf2 is not None and cc2 > cc: Wf, cc = Wf2, cc2
        if Wf is None: continue
        row[k] = {'m': [round(float(v), 5) for v in Wf.ravel()], 'cc': round(float(cc), 3)}
        prev[k] = Wf
    out[f] = row
    print(f, ' '.join('%s:%.3f(%+.1f,%+.1f)' % (k, v['cc'], v['m'][2] + v['m'][0] * CEN[k][0] + v['m'][1] * CEN[k][1] - CEN[k][0], v['m'][5] + v['m'][3] * CEN[k][0] + v['m'][4] * CEN[k][1] - CEN[k][1]) for k, v in row.items()), flush=True)
json.dump(out, open(outp, 'w'))
