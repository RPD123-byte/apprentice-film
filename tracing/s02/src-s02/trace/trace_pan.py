#!/usr/bin/env python3
# s02 world mosaic of the pans (measurement script, not loaded by the film). The room between the two sharp views and
# the beanie's crown are only ever seen while the camera moves, blurred. Every pan frame (10.56–14.40 s out, 16.56–19.12 s
# back) is brought back to paint values (invgrade.py) and placed in WORLD coordinates with the measured camera offset
# (cam.js); the frames are averaged with weights favouring the least blurred ones (exp(-L/5), L = the fitted smear
# length) and the flying owl masked out (its measured body and wing outlines on the root track, dilated 20 px). The mosaic, at half resolution, is split
# into seven brightness levels and vectorized as contours with holes (mean value per band).
# Shapes and values only — no pixels are stored.
# Usage: trace_pan.py out.json dbgdir
import cv2, numpy as np, json, sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import invgrade as ig, wing_local as wl, levels as lv
out, dbg = sys.argv[1:3]; os.makedirs(dbg, exist_ok=True)
W, H = 2206, 946
HERE = os.path.dirname(os.path.abspath(__file__))
cam = open(os.path.join(HERE, '..', 'cam.js')).read()
CAM0 = int(re.search(r'CAM0 = (\d+)', cam).group(1))
CAM = [float(v) for v in re.search(r'CAM = \[(.*?)\]', cam, re.S).group(1).split(',')]
def off(f):
    if f < CAM0: return (0.0, 0.0)
    i = min(len(CAM) // 2 - 1, f - CAM0); return (CAM[2 * i], CAM[2 * i + 1])
s02 = open(os.path.join(HERE, '..', '..', 's02.js')).read()
def table(name):
    body = re.search(name + r' = \[(.*?)\];', s02, re.S).group(1)
    return [[float(v) for v in r.split(',')] for r in re.findall(r'\[([^\[\]]+)\]', body)]
BO, BB = table('BLUR_OUT'), table('BLUR_BACK')
def tab(T, t, k):
    if t <= T[0][0]: return T[0][k]
    for i in range(1, len(T)):
        if t <= T[i][0] + 1e-6:
            a, b = T[i - 1], T[i]; return a[k] + (b[k] - a[k]) * (t - a[0]) / (b[0] - a[0])
    return T[-1][k]
def blurL(t):
    if 10.9 <= t < 14.43: return tab(BO, t, 1)
    if 16.52 <= t < 19.2: return tab(BB, t, 1)
    return 0.0
# world canvas (half resolution): x -240..4560, y -2000..1000
X0, Y0, X1, Y1 = [int(v) for v in os.environ['BOX'].split(',')] if os.environ.get('BOX') else (-240, -2000, 4560, 1000); S = 0.5
MW, MH = int((X1 - X0) * S), int((Y1 - Y0) * S)
acc = np.zeros((MH, MW), np.float64); wsum = np.zeros((MH, MW), np.float64)
# the two pans expose the room a little differently (the return is ~20% brighter in the mids): the shapes come from
# the joint mosaic, and each shape also gets its value in each pan's own mosaic
accP = {0: np.zeros((MH, MW)), 1: np.zeros((MH, MW))}; wP = {0: np.zeros((MH, MW)), 1: np.zeros((MH, MW))}
cap = cv2.VideoCapture(wl.V)
OWLW = None
if os.environ.get('WINGS') and os.environ.get('FLYREG'):
    OWLW = {r['f']: r for r in json.load(open(os.environ['WINGS']))}
    fr_ = (cv2.imread(os.environ['FLYREG'], 0) > 0).astype(np.uint8)
    cs_, _ = cv2.findContours(fr_, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    BODYC = max(cs_, key=cv2.contourArea)[:, 0, :].astype(float) + [wl.U0, wl.V0]
frames = [int(v) for v in os.environ['FRAMES'].split(',')] if os.environ.get('FRAMES') else list(range(264, 361)) + list(range(414, 479))
for f in frames:
    t = f / 25
    cap.set(cv2.CAP_PROP_POS_FRAMES, f); ok, im = cap.read()
    P = ig.paint_of(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255, t)
    wgt = np.full((H, W), np.exp(-blurL(t) / 5.0), np.float32)
    if f >= 400:                                    # the flying owl: its measured silhouette (body + wings), dilated
        x, y, s, rot = [wl.spline(t, k) for k in (1, 2, 3, 4)]
        m = np.ones((H, W), np.uint8)
        if OWLW is not None and f in OWLW:
            c_, sn_ = np.cos(rot), np.sin(rot)
            tf = lambda q: np.stack([x + s * (c_ * q[:, 0] - sn_ * q[:, 1]), y + s * (sn_ * q[:, 0] + c_ * q[:, 1])], 1)
            om = np.zeros((H, W), np.uint8)
            for q in (BODYC, np.array(OWLW[f]['L'], float), np.array(OWLW[f]['R'], float)): cv2.fillPoly(om, [np.round(tf(q)).astype(np.int32)], 1)
            m = 1 - cv2.dilate(om, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))
        else:
            cv2.ellipse(m, (int(x), int(y) - int(40 * s)), (int(470 * s), int(330 * s)), 0, 0, 360, 0, -1)
        wgt *= m
    ox, oy = off(f)
    # frame -> world: world = frame - off ; mosaic px = (world - X0) * S
    M = np.array([[S, 0, (-ox - X0) * S], [0, S, (-oy - Y0) * S]], np.float32)
    Pw = cv2.warpAffine(P, M, (MW, MH), flags=cv2.INTER_AREA, borderValue=0)
    Ww = cv2.warpAffine(wgt, M, (MW, MH), flags=cv2.INTER_LINEAR, borderValue=0)
    acc += Pw * Ww; wsum += Ww
    k = 0 if f < 400 else 1
    ww = cv2.warpAffine((wgt > 0).astype(np.float32) * max(0.05, float(wgt.max())), M, (MW, MH), flags=cv2.INTER_LINEAR, borderValue=0)
    accP[k] += Pw * ww; wP[k] += ww
mos = (acc / np.maximum(wsum, 1e-6)).astype(np.float32); cov = (wsum > 1e-4).astype(np.uint8)
mosK = {k: (accP[k] / np.maximum(wP[k], 1e-6)).astype(np.float32) for k in (0, 1)}; covK = {k: wP[k] > 1e-4 for k in (0, 1)}
np.save(f'{dbg}/mosaic.npy', mos); np.save(f'{dbg}/cov.npy', cov)
cv2.imwrite(f'{dbg}/mosaic.jpg', (np.clip(mos, 0, 1) * 255).astype(np.uint8))
LEV = [float(v) for v in os.environ['LEV'].split(',')] if os.environ.get('LEV') else [0.035, 0.07, 0.12, 0.19, 0.28, 0.4, 0.55]
cov = cv2.erode(cov, np.ones((3, 3), np.uint8))
ms = []
if os.environ.get('COVLEV'):                   # the coverage itself as the first level (the layer is then opaque only
    ms.append(cov.copy()); LEV = [0.0] + LEV   # where the frames saw the world; its value = the dark paper there)
for t in LEV[len(ms):]:
    m = ((cv2.GaussianBlur(mos, (0, 0), 0.7) > t) & (cov > 0)).astype(np.uint8)
    ms.append(cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)))
levels = []
for k, m in enumerate(ms):
    band = m & (1 - ms[k + 1]) if k + 1 < len(ms) else m
    L = lv.vectorize(mos, m, band, eps=float(os.environ.get('EPS', 0.9)), tile=int(os.environ.get('TILE', 48)))
    # each shape's value in each pan's own mosaic (the same shape, rasterized over its box)
    for sh in L:
        x0, y0, x1, y1 = sh['bb']; fm = np.zeros((y1 - y0, x1 - x0), np.uint8)
        for q in sh['r']:
            t = np.zeros_like(fm); cv2.fillPoly(t, [np.array(q, np.int32) - [x0, y0]], 1); fm ^= t
        bsel = (fm > 0) & (band[y0:y1, x0:x1] > 0)
        for kk, key in ((0, 'vo'), (1, 'vb')):
            sel = bsel & covK[kk][y0:y1, x0:x1]
            sh[key] = round(float(np.mean(mosK[kk][y0:y1, x0:x1][sel])), 3) if sel.sum() > 3 else sh['v']
    levels.append(L)
    print('level', LEV[k], len(L), 'shapes', sum(len(q) for s in L for q in s['r']), 'points', flush=True)
paper = float(np.mean(mos[(cov > 0) & (ms[0] == 0)]))
json.dump({'levels': levels, 'paper': round(paper, 3), 'x0': X0, 'y0': Y0, 'scale': S, 'w': MW, 'h': MH}, open(out, 'w'))
