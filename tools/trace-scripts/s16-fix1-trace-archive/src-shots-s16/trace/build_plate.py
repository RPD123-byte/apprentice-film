#!/usr/bin/env python3
# s16: build the clean static plate (pre-grade luminance, measurement only) and the camera table.
#  - inner: source frame 1175 (47.00 s); the owl's place there is taken from 1153 (the owl is elsewhere then);
#    the steam above the mug is blacked out (it is drawn per frame); the eye openings are max(1175, 1153), which
#    removes both irises (they are 40 px apart), so the irises can be drawn per frame.
#  - camera: affine plate->frame for every frame 1143..1192 (ECC; identity where the fit says so).
#  - margins (the plate is M px wider on every side for the shake and the pull-back): filled from the frames that
#    reveal them, mapped back through their camera.
# Writes OUT/plate.npy, OUT/cams.json, OUT/eyes.npz (scratch; nothing of this is loaded by the film).
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
import tr, cv2, numpy as np

OUT = '/Users/computer/rootline/apprentice-film/snapshots/s16-p2-tools'
W, H, M = 2206, 946, 90
A = tr.pre(1175); B = tr.pre(1153)

# ---- owl@1175 patch from 1153
d = np.abs(cv2.GaussianBlur(A, (0, 0), 2) - cv2.GaussianBlur(B, (0, 0), 2))
box = np.zeros(A.shape, np.uint8); box[520:946, 100:760] = 1
own = ((d > 0.08) & (box > 0)).astype(np.uint8)
own = cv2.dilate(cv2.morphologyEx(own, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8)), np.ones((13, 13), np.uint8))
P = A.copy(); P[own > 0] = B[own > 0]
o53 = (B - A > 0.08).astype(np.uint8); o53[:, 900:] = 0; o53[700:, :] = 0
o53 = cv2.dilate(cv2.morphologyEx(o53, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8)), np.ones((9, 9), np.uint8))
P[(own > 0) & (o53 > 0)] = 0
# ---- steam
P[360:718, 690:905] = 0

# ---- eyes: the openings (between the lash line and the lower lid) read off 8x grids of 1175 and 1153
# (snapshots/s16-p2-tools/open_*.png); inside them max(1175, 1153) is the white of the eye without either iris
EYEBOX = {'L': (1276, 198, 1366, 238), 'R': (1448, 194, 1546, 238)}
EYEOPEN = {'L': [(1283, 215), (1290, 211), (1300, 208), (1310, 206.5), (1320, 205.5), (1330, 205.5), (1340, 206), (1348, 207.5),
                 (1354, 210), (1358, 213), (1361, 216), (1356, 221), (1348, 225), (1340, 227.5), (1330, 228.5), (1320, 229),
                 (1310, 229), (1300, 227.5), (1292, 224), (1286, 219.5)],
           'R': [(1459, 213), (1464, 209), (1472, 206), (1480, 204), (1490, 203), (1500, 203), (1510, 203.5), (1518, 205),
                 (1524, 207.5), (1529, 211), (1531, 213), (1526, 217), (1520, 221), (1510, 224.5), (1500, 225.5), (1490, 225.5),
                 (1480, 224), (1470, 221), (1463, 217)]}
eyes = {}
for k, (x0, y0, x1, y1) in EYEBOX.items():
    a = A[y0:y1, x0:x1]; b = B[y0:y1, x0:x1]; mx = np.maximum(a, b)
    op = np.zeros((y1 - y0, x1 - x0), np.uint8)
    cv2.fillPoly(op, [np.round((np.array(EYEOPEN[k]) - [x0, y0]) * 4).astype(np.int32)], 1, shift=2)
    opd = cv2.dilate(op, np.ones((3, 3), np.uint8))
    P[y0:y1, x0:x1][opd > 0] = mx[opd > 0]
    ia = ((a < mx - 0.15) & (opd > 0)).astype(np.uint8); ib = ((b < mx - 0.15) & (opd > 0)).astype(np.uint8)
    c = np.array(EYEOPEN[k], float)                  # pixel-centre coords (eyes.py moves it out 0.5 into canvas units)
    eyes[k] = dict(box=(x0, y0, x1, y1), opening=c, open_mask=op, irisA=ia, irisB=ib)
np.savez(f'{OUT}/eyes.npz', **{f'{k}_{n}': v for k, e in eyes.items() for n, v in e.items() if n != 'box'})

# ---- cameras (plate -> frame), ECC affine; masks exclude owl, steam, eyes
def ecc(ref, im, msk, init=None):
    warp = np.eye(2, 3, dtype=np.float32) if init is None else init.astype(np.float32).copy()
    for sc in (0.25, 0.5, 1.0):
        r = cv2.resize(ref, None, fx=sc, fy=sc); i2 = cv2.resize(im, None, fx=sc, fy=sc)
        m2 = cv2.resize(msk, None, fx=sc, fy=sc, interpolation=cv2.INTER_NEAREST)
        w2 = warp.copy(); w2[:, 2] *= sc
        try:
            cc, w2 = cv2.findTransformECC(cv2.GaussianBlur(r, (0, 0), 1.2), cv2.GaussianBlur(i2, (0, 0), 1.2), w2,
                                          cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 400, 1e-7), m2, 5)
        except cv2.error:
            cc = -1
        warp = w2.copy(); warp[:, 2] /= sc
    return cc, warp

cams = {}
base_mask = np.ones(A.shape, np.uint8)
base_mask[340:730, 680:920] = 0                 # steam
for k, e in eyes.items():
    x0, y0, x1, y1 = e['box']; base_mask[y0 - 4:y1 + 4, x0 - 4:x1 + 4] = 0
base_mask[:8, :] = 0; base_mask[-8:, :] = 0; base_mask[:, :8] = 0; base_mask[:, -8:] = 0
for f in list(range(1143, 1153)) + list(range(1186, 1193)):
    Y = tr.pre(f)
    msk = base_mask.copy()
    if f <= 1160:
        msk[:, :1330] = 0                         # the owl is left of x 1330 during the jolt
    else:
        msk[520:946, 100:760] = 0                 # the dazed owl (it moves with the camera, but keep the fit on the room)
    cc, w = ecc(P, Y, msk)
    al = cv2.warpAffine(Y, w, (W, H), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP)
    res = np.abs(cv2.GaussianBlur(al, (0, 0), 1.5) - cv2.GaussianBlur(P, (0, 0), 1.5))[msk > 0].mean() * 255
    ident = np.abs(cv2.GaussianBlur(Y, (0, 0), 1.5) - cv2.GaussianBlur(P, (0, 0), 1.5))[msk > 0].mean() * 255
    cams[f] = dict(A=w.tolist(), cc=float(cc), resid=float(res), resid_ident=float(ident))
    print(f, 'cc %.4f resid %.2f (identity %.2f)' % (cc, res, ident), np.round(w, 4).tolist(), flush=True)
json.dump(cams, open(f'{OUT}/cams.json', 'w'), indent=1)

# ---- extended plate with margins
E = np.full((H + 2 * M, W + 2 * M), np.nan, np.float32)
E[M:M + H, M:M + W] = P
gx, gy = np.meshgrid(np.arange(W + 2 * M, dtype=np.float32) - M, np.arange(H + 2 * M, dtype=np.float32) - M)
for f in [1192, 1191, 1190, 1189, 1188, 1145, 1146, 1144, 1143, 1147, 1148, 1149]:
    if f not in cams: continue
    w = np.array(cams[f]['A'], np.float32)
    qx = w[0, 0] * gx + w[0, 1] * gy + w[0, 2]; qy = w[1, 0] * gx + w[1, 1] * gy + w[1, 2]
    Y = tr.pre(f)
    samp = cv2.remap(Y, qx, qy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=np.nan)
    ok = np.isnan(E) & (qx >= 0) & (qx <= W - 1) & (qy >= 0) & (qy <= H - 1) & ~np.isnan(samp)
    if f <= 1150:
        ok &= gx > 1300                           # never take the owl
    E[ok] = samp[ok]
    print('margin from', f, int(ok.sum()), 'px', flush=True)
# what no frame shows is never on screen: black
E[np.isnan(E)] = 0
np.save(f'{OUT}/plateE.npy', E)
cv2.imwrite(f'{OUT}/plateE.png', (np.clip(E, 0, 1) * 255).astype(np.uint8))
print('done')
