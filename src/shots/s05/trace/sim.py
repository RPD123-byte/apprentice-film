# Python stand-in for ../ink.js (same drawing model), to tune the build without a browser.
import numpy as np, cv2
SS = 4
BLUR = 1.6

def _fill_rings(canvas_ss, rings, val):
    m = np.zeros(canvas_ss.shape, np.uint8)
    for r in rings:
        t = np.zeros_like(m); cv2.fillPoly(t, [np.round(r * SS - 0.5).astype(np.int32)], 1); m ^= t
    canvas_ss[m > 0] = val

def stroke_poly(s, wscale=1.0, end=0.55, caps=(True, True)):
    """outline polygon of a tapered stroke (x, y, w per row), like ink.js taper()"""
    P = s[:, :2]; w = s[:, 2] * wscale; n = len(P)
    if n < 2: return None
    L, R = [], []
    for i in range(n):
        a = P[max(0, i - 1)]; b = P[min(n - 1, i + 1)]; d = b - a; d = d / (np.linalg.norm(d) + 1e-9)
        f = end if ((i == 0 and caps[0]) or (i == n - 1 and caps[1])) else 1.0
        hw = w[i] * f / 2
        L.append(P[i] + np.array([-d[1], d[0]]) * hw); R.append(P[i] - np.array([-d[1], d[0]]) * hw)
    return np.array(L + R[::-1])

def layer_canvas(lay, wscale=1.0, blur=BLUR, draw_strokes=True, soft=None):
    x0, y0, x1, y1 = lay['box']; h, w = y1 - y0, x1 - x0
    big = np.full((h * SS, w * SS), np.float32(lay.get('base0', 0)), np.float32)
    for v, rings in lay['levels']: _fill_rings(big, rings, v)
    img = cv2.resize(big, (w, h), interpolation=cv2.INTER_AREA)
    if blur > 0: img = cv2.GaussianBlur(img, (0, 0), blur)
    if draw_strokes:
        big = cv2.resize(img, (w * SS, h * SS), interpolation=cv2.INTER_NEAREST)
        cov = np.zeros((h * SS, w * SS), np.uint8)
        for pol in (-1, 1):
            for i, s in enumerate(lay['strokes'][pol]):
                pg = stroke_poly(s, wscale * (lay['wsc'][pol][i] if 'wsc' in lay else 1.0), caps=lay['caps'][pol][i] if 'caps' in lay else (True, True))
                if pg is None: continue
                v = float(lay['vals'][pol][i]) if 'vals' in lay else float(np.mean(s[:, 3]))
                cv2.fillPoly(big, [np.round(pg * SS - 0.5).astype(np.int32)], v)
                cp = lay['caps'][pol][i] if 'caps' in lay else (True, True)
                for j, ii in ((0, 0), (1, len(s) - 1)):
                    if not cp[j]:
                        cx, cy = s[ii, :2] * SS - 0.5; cv2.circle(big, (int(round(cx)), int(round(cy))), int(round(s[ii, 2] * wscale * (lay['wsc'][pol][i] if 'wsc' in lay else 1) * SS / 2)), v, -1)
        # downsample only where strokes were drawn would be faster; keep simple
        img = cv2.resize(big, (w, h), interpolation=cv2.INTER_AREA)
        sf = lay.get('soft', 0) if soft is None else soft
        if sf > 0: img = cv2.GaussianBlur(img, (0, 0), sf)
    a = np.zeros((h * SS, w * SS), np.uint8)
    for r in lay['alpha']:
        t = np.zeros_like(a); cv2.fillPoly(t, [np.round(r * SS - 0.5).astype(np.int32)], 1); a ^= t
    alpha = cv2.resize(a.astype(np.float32), (w, h), interpolation=cv2.INTER_AREA)
    return img, alpha

def composite(layers, order, H=946, W=2206, **kw):
    out = np.zeros((H, W), np.float32)
    for name in order:
        if name not in layers: continue
        lay = layers[name]; img, alpha = layer_canvas(lay, **kw)
        x0, y0, x1, y1 = lay['box']
        X0, Y0, X1, Y1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
        sub = (slice(Y0 - y0, Y1 - y0), slice(X0 - x0, X1 - x0))
        o = out[Y0:Y1, X0:X1]; a = alpha[sub]
        out[Y0:Y1, X0:X1] = o * (1 - a) + img[sub] * a
    return out
