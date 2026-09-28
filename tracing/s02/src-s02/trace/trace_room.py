#!/usr/bin/env python3
# s02 room ink as outlines (measurement script, not loaded by the film): the room is white line work on black, so its
# light is split into thirteen brightness levels (paint > 0.03 ... 0.87, narrow bands, untiled), each vectorized at 2x as contours with
# holes and given the mean paint value of its own band. Two sharp views of the room are measured, in WORLD coordinates
# (world = the 6.04 s frame; camera offsets from src/shots/s02/cam.js):
#   stare  frames 206–216 (8.24–8.64 s), offset (0, 0): the shelves round his head (the designer itself masked out)
#   boxes  frames 362–398 (14.48–15.92 s), offset (-2203.3, 1893.4): the carton stack; the sitting owl is inpainted over
#          (it is drawn by the owl kit; the box top behind it is never seen clearly in the source)
# Shapes and values only — no source pixels are stored.
# Usage: trace_room.py geo.json out.json dbgdir
import cv2, numpy as np, json, sys, os, importlib.util
spec = importlib.util.spec_from_file_location('ig', os.path.join(os.path.dirname(__file__), 'invgrade.py'))
ig = importlib.util.module_from_spec(spec); spec.loader.exec_module(ig)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import levels as lv
geo, out, dbg = sys.argv[1:4]
os.makedirs(dbg, exist_ok=True)
G = json.load(open(geo)); W, H = 2206, 946; SS = 2
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap = cv2.VideoCapture(V)
def mean_frames(fs):
    acc = None
    for f in fs:
        cap.set(cv2.CAP_PROP_POS_FRAMES, f); ok, im = cap.read()
        g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
        acc = g if acc is None else acc + g
    return acc / len(fs)
LEV = [0.03, 0.05, 0.08, 0.11, 0.15, 0.2, 0.26, 0.33, 0.42, 0.52, 0.63, 0.75, 0.87]

def run(P, region, off, name):
    P2 = cv2.resize(P, (W * SS, H * SS), interpolation=cv2.INTER_CUBIC)
    R2 = cv2.resize(region, (W * SS, H * SS), interpolation=cv2.INTER_NEAREST)
    ms = []
    for t in LEV:
        m = ((P2 > t) & (R2 > 0)).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        ms.append(m)
    res = []
    for k, m in enumerate(ms):
        band = m & (1 - ms[k + 1]) if k + 1 < len(ms) else m
        L = lv.vectorize(P2, m, band, off=np.round(np.array(off) * 2).astype(int), minarea=12, eps=1.4, tile=100000)
        print(name, 'level', LEV[k], len(L), 'shapes', sum(len(q) for s in L for q in s['r']), 'points', flush=True)
        res.append(L)
    # the paper (black) under the levels: median of the uncovered pixels
    paper = float(np.mean(P2[(R2 > 0) & (ms[0] == 0)]))
    return {'levels': res, 'paper': round(paper, 3)}

res = {}
# ---- stare room (the designer masked out; he is drawn over it)
def poly_mask(pts):
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.round(np.array(pts)).astype(np.int32)], 1); return m
flat = lambda f: [[f[i], f[i + 1]] for i in range(0, len(f), 2)]
des = poly_mask(G['HOODIE']) | poly_mask(G['SKIN']) | poly_mask(G['BEANIE'])
for p in G['HAIR']: des |= poly_mask(flat(p['o']))
L = G['LAPTOP']; des[L['y']:, L['x0']:L['x1']] = 1
reg = 1 - cv2.erode(des, np.ones((9, 9), np.uint8))
A = ig.paint_of(mean_frames(range(206, 217)), 8.44)
res['stare'] = run(A, reg, (0, 0), 'stare')
# ---- the carton hold (owl inpainted)
B = ig.paint_of(mean_frames(range(362, 399)), 15.2)
g8 = (np.clip(B, 0, 1) * 255).astype(np.uint8)
owl = (cv2.GaussianBlur(B, (0, 0), 3) > 0.55).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(owl)
om = np.zeros_like(owl)
for i in range(1, n):
    x, y, w, h, a = st[i]
    if x < 1250 and x + w > 950 and y < 330 and a > 2000: om[lab == i] = 1
om[330:] = 0                                                   # the lit box below the owl is not owl...
cv2.ellipse(om, (1088, 200), (125, 140), 0, 0, 360, 1, -1)    # head, headphones (dark cushions), body (measured 15.0 s)
om[334:] = 0
om = cv2.dilate(om, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
tal = np.zeros_like(om); tal[326:362, 1012:1170] = 1          # ...except the white talons hooked over its edge
om |= tal & cv2.dilate((cv2.GaussianBlur(B, (0, 0), 1.0) > 0.62).astype(np.uint8), np.ones((7, 7), np.uint8))
# the headphone cushions / band are dark: include the owl's bounding region above the box top
ys, xs = np.nonzero(om); print('owl mask bbox', xs.min(), xs.max(), ys.min(), ys.max())
cv2.imwrite(f'{dbg}/owlmask.png', om * 255)
# what the sitting owl hides is seen once it has flown up (camera still until 16.52): frames 16.16–16.52, each with the
# flying owl masked (its measured body region + both wing outlines, placed with the root track, dilated 12 px)
import json as _json, wing_local as wl
WJ = os.environ.get('WINGS'); FR = os.environ.get('FLYREG')
if WJ and FR:
    W_ = {r['f']: r for r in _json.load(open(WJ))}
    fly = (cv2.imread(FR, 0) > 0).astype(np.uint8)
    cs_, _ = cv2.findContours(fly, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); bodyC = max(cs_, key=cv2.contourArea)[:, 0, :].astype(float) + [wl.U0, wl.V0]
    accB = np.zeros((H, W), np.float64); wB = np.zeros((H, W), np.float64)
    for f in range(404, 414):
        t = f / 25; x, y, s_, rot = [wl.spline(t, k) for k in (1, 2, 3, 4)]
        c, sn = np.cos(rot), np.sin(rot)
        tf = lambda q: np.stack([x + s_ * (c * q[:, 0] - sn * q[:, 1]), y + s_ * (sn * q[:, 0] + c * q[:, 1])], 1)
        m = np.zeros((H, W), np.uint8)
        for q in (bodyC, np.array(W_[f]['L'], float), np.array(W_[f]['R'], float)): cv2.fillPoly(m, [np.round(tf(q)).astype(np.int32)], 1)
        m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
        cap.set(cv2.CAP_PROP_POS_FRAMES, f); ok, im = cap.read()
        Pf = ig.paint_of(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255, t)
        accB += Pf * (1 - m); wB += (1 - m)
    seen = (wB > 0.5) & (om > 0)
    B = B.copy(); B[seen] = (accB[seen] / wB[seen]).astype(np.float32)
    om = (om > 0) & ~seen
    om = om.astype(np.uint8)
    print('behind the owl: seen', int(seen.sum()), 'px; still hidden', int(om.sum()), flush=True)
    g8 = (np.clip(B, 0, 1) * 255).astype(np.uint8)
Bi = cv2.inpaint(g8, om, 9, cv2.INPAINT_TELEA).astype(np.float32) / 255
np.save(f'{dbg}/B.npy', B); np.save(f'{dbg}/Bi.npy', Bi)
res['boxes'] = run(Bi, np.ones((H, W), np.uint8), (0, 0), 'boxes')    # hold-frame coords; placed at world (2203.3, -1893.4)
json.dump(res, open(out, 'w'))
