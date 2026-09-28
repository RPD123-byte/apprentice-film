#!/usr/bin/env python3
# Pass 3: key drawings for the fastest frames of the camera settle (23.12-23.48). There the camera still moves 10-35 px
# a frame and the view changes shape (the arc's last few degrees), so the settled layers warped through their motion
# grids stay 8-11 levels (blurred) off the source. Each of these frames is instead traced on its own, flattened (one
# layer for the whole frame), with the same tracer and fit as the layers (params.sh): ink strokes as centre-lines +
# the value study as nested iso-value outlines, on the un-graded source frame. The laptop screen is left out (known =
# false inside the screen quad carried by the desk's settle grid, grown 1 px): s05.js draws the page over it.
# Output: CACHE/layer_key<k>.pkl -> tone.py key<k> -> export.py key<k> (../data/key<k>.js)
# Usage: . ./params.sh; python3 build_keys.py 578,579,...
import numpy as np, cv2, pickle, os, sys, re, time
import frames
from build import split, iso_regions, dil, ero, PAR, ITERS, JOINT, BASE_SIGMA, LEVEL_STEP, H, W
from ridges import ridge_paths
from strokefit import stroke_layers, fit_base, fit_strokes, joint_values
CACHE = frames.CACHE
HERE = os.path.dirname(os.path.abspath(__file__))
SCREEN = np.array([[315, 246], [834, 168], [898, 519], [409, 648]], np.float64)
SCR_GROW = 1        # (the screen's lit inner edge stays in the trace; the page is drawn inside it)

def dec(s):
    out, i = [], 0
    while i < len(s):
        z, sh = 0, 0
        while True:
            b = ord(s[i]) - 63; i += 1; z += (b & 0x1f) << sh; sh += 5
            if b < 0x20: break
        out.append(-(z + 1) // 2 if z % 2 else z // 2)
    return out

def desk_field(k):
    """the desk's settle grid for frame k (../data/settle.js) as a function (x, y) -> (x', y')"""
    src = open(os.path.join(HERE, '..', 'data', 'settle.js')).read()
    ks = [int(v) for v in re.search(r'export const KS = \[([^\]]*)\]', src).group(1).split(',')]
    m = re.search(r'desk: \{ x0: (-?\d+), y0: (-?\d+), G: (\d+), nx: (\d+), ny: (\d+), d: (\[.*?\]) \}', src)
    x0, y0, G, nx, ny = map(int, m.groups()[:5])
    import json
    ds = json.loads(m.group(6))
    a = np.array(dec(ds[ks.index(k)]), np.float64).reshape(ny, nx, 2) / 10
    def f(x, y):
        fx = np.clip((x - x0) / G, 0, nx - 1.0001); fy = np.clip((y - y0) / G, 0, ny - 1.0001)
        i0, j0 = int(fx), int(fy); u, v = fx - i0, fy - j0
        d = (a[j0, i0] * (1 - u) + a[j0, i0 + 1] * u) * (1 - v) + (a[j0 + 1, i0] * (1 - u) + a[j0 + 1, i0 + 1] * u) * v
        return x + d[0], y + d[1]
    return f

def build_key(k):
    t0 = time.time()
    T = frames.pre(k).mean(2).astype(np.float32)
    f = desk_field(k)
    q = np.array([f(x, y) for x, y in SCREEN], np.float64)
    scr = np.zeros((H, W), np.uint8); cv2.fillPoly(scr, [np.round(q).astype(np.int32)], 1)
    scr = dil(scr > 0, SCR_GROW)
    vis = ~scr; ec = np.ones((H, W), bool)
    known = ero(vis, 1); tmask = known.copy()
    strokes, caps = {}, {}
    for pol in (1, -1):
        S_, _ = ridge_paths(T, pol, PAR['hi'], PAR['lo'], minlen=PAR['minlen'], mask=tmask.astype(np.float32))
        strokes[pol], caps[pol] = split(S_)
    vals = {p: [float(np.mean(s[:, 3])) for s in strokes[p]] for p in (1, -1)}
    wsc = {p: [1.0] * len(strokes[p]) for p in (1, -1)}
    for it in range(ITERS):
        a, s = stroke_layers(T.shape, strokes, vals, wsc, caps)
        B = fit_base(T, a, s, known, ec, sigma=BASE_SIGMA)
        vals, wsc = fit_strokes(T, B, strokes, vals, wsc, refit_w=(it == 0), caps=caps)
    for it in range(JOINT):
        vals = joint_values(T, B, strokes, vals, wsc, caps, region=known)
        a, s = stroke_layers(T.shape, strokes, vals, wsc, caps)
        B = fit_base(T, a, s, known, ec, sigma=BASE_SIGMA)
    if not JOINT:
        a, s = stroke_layers(T.shape, strokes, vals, wsc, caps)
        B = fit_base(T, a, s, known, ec, sigma=BASE_SIGMA)
    lv = iso_regions(B, ec, LEVEL_STEP)
    alpha = [np.array([[0, 0], [W, 0], [W, H], [0, H]], np.float32)]
    res = dict(T=T, soft=float(os.environ.get('SOFT', 0)), box=(0, 0, W, H), strokes=strokes, caps=caps, vals=vals, wsc=wsc,
               levels=lv, alpha=alpha, base=B, base0=LEVEL_STEP / 2, ext=ec, vis=vis)
    print(f'key{k}', 'strokes', len(strokes[1]), len(strokes[-1]), 'levels', len(lv), f'{time.time() - t0:.1f}s', flush=True)
    return res

if __name__ == '__main__':
    for k in [int(v) for v in sys.argv[1].split(',')]:
        pickle.dump(build_key(k), open(f'{CACHE}/layer_key{k}.pkl', 'wb'))
