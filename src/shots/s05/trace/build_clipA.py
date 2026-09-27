#!/usr/bin/env python3
# Pass 3: the figure and the owl as the source draws them in its first clip (23.12-24.00).
# The source cross-dissolves at 24.00-24.12 (frames 599-604, mix 0.1/0.3/0.5/0.55/0.75/1) from one generated clip into
# the next: the room is the same drawing in both, but the designer and the owl are re-drawn (blurred error 7.5-8 between
# the two, 1.7 within either). ../data/fig.js and owl.js are traced on the second clip (the settled frame 24.16-25.12);
# this traces figA / owlA on the first: the pre-grade mean of 23.52-23.96 (frames 588-599, camera at rest), each frame
# divided by s05.js's LIGHT gain for it (G0 + A w(x)), so the shot's light re-applies it. Same masks, extents and hidden
# fills as the second clip's layers (read from CACHE/layer_<name>.pkl), same tracer and fit (params.sh).
# (desk: its left part only, see below)
# Usage: . ./params.sh; python3 build_clipA.py [fig,owl,desk]  -> CACHE/layer_<name>A.pkl (then tone + export)
import numpy as np, cv2, pickle, os, sys, time
import frames
from build import crop, split, iso_regions, dil, ero, PAR, ITERS, JOINT, BASE_SIGMA, LEVEL_STEP, H, W
from ridges import ridge_paths
from strokefit import stroke_layers, fit_base, fit_strokes, joint_values
CACHE = frames.CACHE
KS = list(range(588, 600))
# s05.js LIGHT rows for those frames: [t, G0, A]
LIGHT = {588: (0.999, 0.241), 589: (0.997, 0.241), 590: (1.000, 0.237), 591: (0.996, 0.236), 592: (0.995, 0.237), 593: (0.994, 0.235),
         594: (0.994, 0.234), 595: (0.992, 0.232), 596: (0.991, 0.232), 597: (0.989, 0.230), 598: (0.987, 0.231), 599: (0.984, 0.231)}
def wx():
    x = np.arange(W) + 0.5
    return np.interp(x, [0, 1250, 1700, W], [1, 1, 0.2, 0.2]).astype(np.float32)
def target_A():
    p = f'{CACHE}/staticA.npy'
    if os.path.exists(p): return np.load(p)
    w = wx()[None, :]
    acc = np.zeros((H, W), np.float32)
    for k in KS:
        G0, A = LIGHT[k]
        acc += frames.pre(k).mean(2) / (G0 + A * w)
    acc /= len(KS)
    np.save(p, acc.astype(np.float32)); return acc

def build_A(name, TA, owl_ext=None):
    t0 = time.time()
    lay = pickle.load(open(f'{CACHE}/layer_{name}.pkl', 'rb'))
    box = lay['box']
    Tn = crop(TA, box)
    vis_all = lay['vis'].copy(); ec = lay['ext']
    # what the first clip shows of this layer: its visible part, less (for the figure) what the owl covers there (those
    # parts were filled from other frames; keep them as they are)
    vA = vis_all.copy()
    if owl_ext is not None: vA &= ~owl_ext
    Tc = np.where(vA, Tn, lay['T']).astype(np.float32)
    vc = vis_all
    known = ero(vc, 1); tmask = known.copy()
    strokes, caps = {}, {}
    for pol in (1, -1):
        S_, _ = ridge_paths(Tc, pol, PAR['hi'], PAR['lo'], minlen=PAR['minlen'], mask=tmask.astype(np.float32))
        strokes[pol], caps[pol] = split(S_)
    vals = {p: [float(np.mean(s[:, 3])) for s in strokes[p]] for p in (1, -1)}
    wsc = {p: [1.0] * len(strokes[p]) for p in (1, -1)}
    for it in range(ITERS):
        a, s = stroke_layers(Tc.shape, strokes, vals, wsc, caps)
        B = fit_base(Tc, a, s, known, ec, sigma=BASE_SIGMA)
        vals, wsc = fit_strokes(Tc, B, strokes, vals, wsc, refit_w=(it == 0), caps=caps)
    for it in range(JOINT):
        vals = joint_values(Tc, B, strokes, vals, wsc, caps, region=known)
        a, s = stroke_layers(Tc.shape, strokes, vals, wsc, caps)
        B = fit_base(Tc, a, s, known, ec, sigma=BASE_SIGMA)
    if not JOINT:
        a, s = stroke_layers(Tc.shape, strokes, vals, wsc, caps)
        B = fit_base(Tc, a, s, known, ec, sigma=BASE_SIGMA)
    lv = iso_regions(B, dil(ec, 5), LEVEL_STEP)
    out = dict(lay); out.update(T=Tc, strokes=strokes, caps=caps, vals=vals, wsc=wsc, levels=lv, base=B)
    out.pop('tone', None)
    print(name + 'A', 'strokes', len(strokes[1]), len(strokes[-1]), 'levels', len(lv), f'{time.time() - t0:.1f}s', flush=True)
    return out

if __name__ == '__main__':
    names = sys.argv[1].split(',') if len(sys.argv) > 1 else ['owl', 'fig']
    TA = target_A()
    owl = pickle.load(open(f'{CACHE}/layer_owl.pkl', 'rb'))
    for n in names:
        oe = None
        if n == 'fig':
            # the owl's extent in the figure's box
            fb, ob = pickle.load(open(f'{CACHE}/layer_fig.pkl', 'rb'))['box'], owl['box']
            oe = np.zeros((fb[3] - fb[1], fb[2] - fb[0]), bool)
            oe[ob[1] - fb[1]: ob[3] - fb[1], ob[0] - fb[0]: ob[2] - fb[0]] = dil(owl['ext'], 2)
        if n == 'desk':
            # only the desk's left part (the laptop's left side, the ports and cables, the desk and the left speaker):
            # right of x 560 the hands move through the first clip's frames, and the screen is drawn over the layer
            db = pickle.load(open(f'{CACHE}/layer_desk.pkl', 'rb'))['box']
            hh, ww = db[3] - db[1], db[2] - db[0]
            xx = np.arange(ww)[None, :] + db[0] + 0.5
            keep = np.broadcast_to(xx < 560, (hh, ww)).copy()
            scr = np.zeros((hh, ww), np.uint8)
            cv2.fillPoly(scr, [np.round(np.array([[315, 246], [834, 168], [898, 519], [409, 648]]) - np.array([db[0], db[1]])).astype(np.int32)], 1)
            oe = ~keep | dil(scr > 0, 8)
        res = build_A(n, TA, oe)
        pickle.dump(res, open(f'{CACHE}/layer_{n}A.pkl', 'wb'))
