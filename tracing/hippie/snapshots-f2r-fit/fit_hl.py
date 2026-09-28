# Fit each headline glyph (font glyph, affine: translate, scale, rotate, x-stretch, shared skew) to the source's
# headline face mask. Output: per-glyph placement parameters (measurement), no pixels.
import cv2, numpy as np, sys, json
from PIL import Image, ImageDraw, ImageFont
from scipy.optimize import minimize
FONT = sys.argv[1] if len(sys.argv) > 1 else 'Shrikhand.ttf'
X0, Y0 = 630, 80
M = cv2.imread('face-mask.png', 0).astype(np.float32) / 255
H, W = M.shape
S0 = 400
F = ImageFont.truetype(FONT, S0)
def glyph(ch):
    pad = 200
    im = Image.new('L', (S0 * 2, S0 * 2), 0); d = ImageDraw.Draw(im)
    d.text((pad, S0 * 1.3), ch, font=F, fill=255, anchor='ls')
    return np.asarray(im, np.float32) / 255, (pad, S0 * 1.3)
# target glyph boxes (page coords) from the components, with the char
L1 = [('M', 683, 91, 820, 222), ('i', 823, 94, 859, 199), ('x', 863, 126, 927, 198), ('i', 931, 94, 962, 192), ('n', 968, 119, 1040, 193),
      ('g', 1027, 113, 1112, 229), ('d', 1131, 93, 1205, 195), ('o', 1205, 124, 1275, 198), ('w', 1273, 123, 1367, 200), ('n', 1368, 126, 1445, 210), (',', 1446, 191, 1470, 229)]
L2 = [('l', 740, 236, 789, 342), ('a', 792, 258, 856, 329), ('t', 854, 240, 903, 322), ('e', 905, 250, 962, 320), ('a', 988, 253, 1048, 318),
      ('t', 1049, 240, 1099, 319), ('n', 1119, 255, 1185, 322), ('i', 1188, 228, 1218, 320), ('g', 1213, 247, 1289, 355), ('h', 1289, 235, 1359, 332),
      ('t', 1360, 250, 1410, 336), ('.', 1412, 315, 1436, 341)]
G = {}
def render(ch, p, k):
    g, (ox, oy) = G[ch]
    tx, ty, s, th, sx = p
    sc = s / S0
    c, sn = np.cos(th), np.sin(th)
    A = np.array([[sx, k], [0, 1]]) * sc
    R = np.array([[c, -sn], [sn, c]])
    Mx = R @ A
    # map glyph image coords (u,v) -> page: q = (u-ox, v-oy); page = T + Mx q ; in mask coords subtract X0,Y0
    T = np.array([tx - X0, ty - Y0]) - Mx @ np.array([ox, oy])
    Aff = np.hstack([Mx, T[:, None]]).astype(np.float32)
    return cv2.warpAffine(g, Aff, (W, H), flags=cv2.INTER_LINEAR)
def score(ch, box, p, k):
    x0, y0, x1, y1 = box
    pad = 14
    sl = (slice(max(0, y0 - Y0 - pad), y1 - Y0 + pad), slice(max(0, x0 - X0 - pad), x1 - X0 + pad))
    r = render(ch, p, k)[sl]; t = M[sl].copy()
    # only the target's own component region matters: mask out neighbours by box
    tb = np.zeros_like(t); tb[max(0, y0 - Y0) - sl[0].start: y1 - Y0 - sl[0].start, max(0, x0 - X0) - sl[1].start: x1 - X0 - sl[1].start] = 1
    t = t * tb
    return 1 - np.minimum(r, t).sum() / max(1e-6, np.maximum(r, t).sum())
def init(ch, box, size):
    x0, y0, x1, y1 = box
    g, (ox, oy) = G[ch]
    ys, xs = np.nonzero(g > 0.5)
    # glyph ink bbox in local units
    gx0, gx1 = (xs.min() - ox) * size / S0, (xs.max() - ox) * size / S0
    gy0, gy1 = (ys.min() - oy) * size / S0, (ys.max() - oy) * size / S0
    return [x0 - gx0, y1 - gy1, size, 0.0, 1.0]
def fit_all(k, size, verbose=False):
    res = []; tot = 0
    for line in (L1, L2):
        for ch, *box in line:
            if ch not in G: G[ch] = glyph(ch)
            p0 = init(ch, box, size)
            f = lambda p: score(ch, box, p, k)
            r = minimize(f, p0, method='Powell', options={'xtol': 0.05, 'ftol': 1e-4, 'maxfev': 1500})
            tot += r.fun; res.append((ch, [float(v) for v in r.x], float(1 - r.fun)))
            if verbose: print(ch, np.round(r.x, 2), 'IoU %.3f' % (1 - r.fun))
    return tot / len(res), res
best = None
for k in ([float(sys.argv[2])] if len(sys.argv) > 2 else [0.0, 0.12, 0.2, 0.28]):
    m, res = fit_all(k, 130)
    print('skew', k, 'mean IoU %.4f' % (1 - m)); sys.stdout.flush()
    if best is None or m < best[0]: best = (m, k, res)
m, k, res = best
m, res = fit_all(k, 130, True)
json.dump({'font': FONT, 'skew': k, 'glyphs': res}, open('fit-' + FONT.split('.')[0] + '.json', 'w'), indent=1)
