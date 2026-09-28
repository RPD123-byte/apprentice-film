# liftfield.py: the smile's displacement fields for s06 (fix pass 1), measured on the source:
# DIS flow from the neutral mean (668-677) to the held-smile mean (712-725), robustly smoothed, sampled on a 16 px
# grid per box and tapered to 0 at the box edges. Writes src/shots/s06/data/lift.js.
#   R, F : the `over` layer (right hair locks + neck under the jaw; fist), weighted by texture x over-layer coverage;
#   FACE : the face (for the neutral <-> smile morph), weighted by texture x (face outline - over layer).
# Checks each field by warping the neutral mean and comparing with the smile mean.
import cv2, numpy as np, json
A = '/Users/computer/rootline/apprentice-film/snapshots/s06-fix1-tools/inputs/'
nm = np.load(A + 'nm.npy'); sm = np.load(A + 'sm.npy')
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM); dis.setFinestScale(0)
f = dis.calc(nm, sm, None)   # DIS: prev(p) ~ next(p + flow(p)): a point at p in the neutral is at p + f in the smile
al = cv2.imread(A + 'L-over.png', cv2.IMREAD_UNCHANGED)[..., 3].astype(np.float32) / 255
face = np.zeros((946, 2206), np.uint8)
cv2.fillPoly(face, [np.array(json.load(open(A + 'faceclip.json')), np.int32)], 1)
face = face.astype(np.float32) * (1 - al)
g = cv2.GaussianBlur(nm.astype(np.float32), (0, 0), 1.2); gy, gx = np.gradient(g); tex = np.clip(np.hypot(gx, gy) / 20, 0, 1)
mag = np.hypot(f[..., 0], f[..., 1])
def sm_(x, s): return cv2.GaussianBlur(x, (0, 0), s)
def field(wt, sg, lim):
    w = (wt + 1e-3) * (mag < lim)
    return np.stack([sm_(f[..., c] * w, sg) / np.maximum(sm_(w, sg), 1e-6) for c in range(2)], -1)
CFG = {'R': ((1180, 360, 1500, 840), tex * al, 10, 8), 'F': ((560, 420, 816, 676), tex * al, 16, 8),
       'FACE': ((960, 560, 1376, 784), tex * face, 10, 12)}
ST = 16; TAPER = 24
out = {}; DS = {}
for k, (box, wt, sg, lim) in CFG.items():
    D = field(wt, sg, lim); DS[k] = D
    x0, y0, x1, y1 = box
    xs = list(range(x0, x1 + 1, ST)); ys = list(range(y0, y1 + 1, ST))
    G = []
    for y in ys:
        for x in xs:
            e = min(x - x0, x1 - x, y - y0, y1 - y); t = np.clip(e / TAPER, 0, 1); t = t * t * (3 - 2 * t)
            d = D[min(y, 945), min(x, 2205)] * t
            G += [round(float(d[0]), 2), round(float(d[1]), 2)]
    out[k] = {'box': [x0, y0, x1, y1], 'step': ST, 'nx': len(xs), 'ny': len(ys), 'd': G}
# Z2: where the right brow's end runs under the hair (the hair layer carries those brow bits): the plain flow, smoothed
# sigma 2.4, on a 4 px grid, tapered over 8 px, for a per-pixel remap of the over layer
ZST = 4; ZT = 8
fz = cv2.GaussianBlur(f, (0, 0), 2.4)
for k, (x0, y0, x1, y1) in {'Z2': (1196, 136, 1324, 244)}.items():
    xs = list(range(x0, x1 + 1, ZST)); ys = list(range(y0, y1 + 1, ZST)); G = []
    for y in ys:
        for x in xs:
            e = min(x - x0, x1 - x, y - y0, y1 - y); t = np.clip(e / ZT, 0, 1); t = t * t * (3 - 2 * t)
            d = fz[y, x] * t; G += [round(float(d[0]), 1), round(float(d[1]), 1)]
    out[k] = {'box': [x0, y0, x1, y1], 'step': ZST, 'nx': len(xs), 'ny': len(ys), 'd': G}
json.dump(out, open(A + 'lift.json', 'w'))
hdr = '''// s06 fix pass 1: the smile's displacement fields, MEASURED on the source: DIS optical flow from the neutral mean
// (frames 668-677) to the held-smile mean (712-725), smoothed (weighted by texture and by what the field moves), sampled
// on a 16 px grid and tapered to 0 over 24 px at each box edge. d = [dx, dy] per grid point, row by row, frame px
// (neutral -> smile). R: the right hair locks and the neck under the jaw (the `over` layer, sigma 10); F: the fist
// (sigma 16); FACE: the lower face, for the neutral <-> smile morph (sigma 10); Z2: the right brow's end under the
// hair (the hair layer carries those brow bits; plain flow, sigma 2.4, 4 px grid, 8 px taper). Motion samples only
// (snapshots/s06-fix1-tools/liftfield.py).
'''
open('/Users/computer/rootline/apprentice-film/src/shots/s06/data/lift.js', 'w').write(hdr + 'export const LIFT = ' + json.dumps(out, separators=(',', ':')) + ';\n')
# check: warp the neutral mean by each field (backward map) and compare with the smile mean on what it moves
yy, xx = np.mgrid[0:946, 0:2206].astype(np.float32)
for k, v in out.items():
    ST = v['step']
    x0, y0, x1, y1 = v['box']; g_ = np.array(v['d'], np.float32).reshape(v['ny'], v['nx'], 2)
    full = np.zeros_like(f)
    up = cv2.resize(g_, ((v['nx'] - 1) * ST + 1, (v['ny'] - 1) * ST + 1), interpolation=cv2.INTER_LINEAR)
    full[y0:y0 + up.shape[0], x0:x0 + up.shape[1]] = up[:946 - y0, :2206 - x0]
    wn = cv2.remap(nm.astype(np.float32), xx - full[..., 0], yy - full[..., 1], cv2.INTER_LINEAR)
    m = (al if k != 'FACE' else face)[y0:y1, x0:x1] > 0.5
    b = lambda im: cv2.GaussianBlur(im.astype(np.float32), (0, 0), 1.5)[y0:y1, x0:x1]
    print(k, '|neutral-smile| %.2f -> warped %.2f' % (np.abs(b(nm) - b(sm))[m].mean(), np.abs(b(wn) - b(sm))[m].mean()),
          'max |D| %.2f' % np.abs(np.array(v['d'])).max())
