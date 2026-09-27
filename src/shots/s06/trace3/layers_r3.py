#!/usr/bin/env python3
# layers_r3.py NAME [NAME ...]: measure r3 layers of s06 and write src/shots/s06/data/r3_<NAME>.js
# (measurement only; the film never loads this, the source or any image).
# Layers (drawing order in the film: face, brow (moving), mouth (moving) | hair, beanie, hand):
#   face  : the static face inside the FACE outline, minus what other layers draw on top (hair, fist) or what moves
#           (brows, mouth patch: their ground is filled in from the skin around them);
#   brow  : the brows, traced against the face layer's own render, so the measured flow can move them;
#   mouth : the mouth patch (lip hatching, stubble), traced against the face layer's render with the mouth line left
#           out (that is fitted per source frame, data/mouth.js), moved by the measured flow;
#   hair  : the dark locks (opaque inside the grown hair outline): a dark ground (a morphological opening keeps the
#           mass, drops the pale strands) and the pale strands as light strokes;
#   beanie: the knit inside the BEANIE outline; hand: the fist inside the HAND outline (the pencil drawn on top).
# Input: snapshots/s06-r2-src/neutral_pre.npy (trace/prep.py). Scratch output: snapshots/s06-r3-out/.
import sys, os, json, time, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np, cv2
import jsdata
from region import build, report

ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
SRC = os.path.join(ROOT, 'snapshots/s06-r2-src'); OUT = os.path.join(ROOT, 'snapshots/s06-r3-out'); os.makedirs(OUT, exist_ok=True)
DATA = os.path.join(HERE, '../data')
# --smile: the held smile; --src FILE --sfx SFX: any other prepared input (prep3.py: owl_post_pre3.npy, blink frames)
def _arg(k, d=None):
    return sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
STATE = 'smile' if '--smile' in sys.argv else _arg('--state', 'neutral')
SFX = '_s' if STATE == 'smile' else _arg('--sfx', '')
SRCFILE = 'smile_pre3.npy' if STATE == 'smile' else _arg('--src', 'neutral_pre3.npy')
pre = np.load(os.path.join(SRC, SRCFILE)).astype(np.float32)
H, W = pre.shape
PJ = os.path.join(OUT, 'polys.json')
subprocess.run(['node', os.path.join(HERE, 'polys.mjs'), PJ], check=True)
POLY = json.load(open(PJ))
DEFAULT_OPTS = {'end': 5, 'endMin': 0.1, 'soft': 0.6, 'wMin': 0.2}
KW = dict(gblur=0.5, gstep=0.02, twoscale=[0.7, 2.0], tone_q=0.7)


def pm(P): return jsdata.poly_mask(P, (H, W))
def grow(m, px): return cv2.dilate(m.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * px + 1, 2 * px + 1))) > 0


def base_masks():
    M = {}
    M['face'] = pm(POLY['FACE']); M['hand'] = pm(POLY['HAND']); M['beanie'] = pm(POLY['BEANIE'])
    M['hairmass'] = jsdata.mass_mask(jsdata.load('hair')['MASS']['hair'], (H, W))
    M['hair'] = grow(M['hairmass'], 1)
    M['patch'] = pm(jsdata.load('mouth')['PATCH'])
    M['pencil'] = jsdata.mass_mask(jsdata.load('front')['MASS']['pencil'], (H, W))
    M['laptop'] = jsdata.mass_mask(jsdata.load('front')['MASS']['laptop'], (H, W))
    brow = np.zeros((H, W), bool); b2 = cv2.GaussianBlur(pre, (0, 0), 2.0)
    for (x0, y0, x1, y1) in ((775, 168, 1002, 278), (1078, 160, 1346, 272)):
        m = np.zeros((H, W), bool); m[y0:y1, x0:x1] = True
        brow |= m & (b2 < 0.78) & ~M['hair']
    brow = cv2.morphologyEx(brow.astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    brow = cv2.morphologyEx(brow, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    M['brow'] = grow(brow > 0, 6)
    # the owl and its headphones (the round-2 measured silhouette, data/owlsil.js), grown 6 px so the layer carries its
    # own edge against the room; the head part (above the neck, y < 430) for the blink frames
    sil = np.zeros((H, W), np.uint8)
    cv2.fillPoly(sil, [np.round(np.asarray(r, np.float64).reshape(-1, 2) * 8).astype(np.int32) for r in jsdata.load('owlsil')['SIL']], 1, shift=3)
    M['owl'] = grow(sil > 0, 6)
    hd = M['owl'].copy(); hd[430:, :] = False
    M['owlhead'] = hd
    # the neutral mouth line (drawn per frame by the mouth system): a band round it is left out of the mouth layer
    ml = jsdata.load('mouth')['SMILE' if STATE == 'smile' else 'NEUTRAL']['line']
    # (the line itself, +-3 px, and the bristle comb above it, up to 18 px: the comb is traced relative to the line,
    # trace3/comb_r3.py, and re-attached to each frame's line)
    import lineframe
    M['mline'] = lineframe.band_mask(ml, (H, W), -3.5, 18.0)
    return M


def bbox(m, pad=0):
    ys, xs = np.nonzero(m)
    return (max(0, xs.min() - pad), max(0, ys.min() - pad), min(W, xs.max() + 1 + pad), min(H, ys.max() + 1 + pad))


def layer_cfg(name, M):
    if name == 'face':
        return dict(region=M['face'], exclude=M['hair'] | M['hand'] | M['patch'] | M['brow'], clip=POLY['FACE'], passes=3, solid_dark=True)
    if name == 'brow':
        return dict(region=M['brow'] & M['face'], exclude=M['hair'], ground_img='face', clip=POLY['FACE'], solids=(0.45, 0.30, 0.16))
    if name == 'mouth':
        return dict(region=M['patch'], exclude=M['hair'] | M['hand'] | M['mline'], clip=jsdata.load('mouth')['PATCH'], solids=None)
    if name == 'hair':
        reg = grow(M['hairmass'], 3)
        return dict(region=reg, exclude=np.zeros((H, W), bool), clip=None, ground_mode='open', ground_r=5, solids=None,
                    light_mask=reg, light_passes=2, passes=1, mask_poly='hair', soft=0.4)
    if name == 'beanie':
        return dict(region=M['beanie'], exclude=np.zeros((H, W), bool), clip=POLY['BEANIE'], light_mask=M['beanie'], soft=0.8)
    if name == 'hand':
        return dict(region=M['hand'], exclude=M['pencil'] | M['laptop'], clip=POLY['HAND'], passes=3, solid_dark=True)
    if name == 'body':
        # (the silhouettes are grown a few px so that neighbouring layers overlap: no strip of the room between them)
        sil = grow(jsdata.mass_mask(jsdata.load('body')['MASS']['sil'], (H, W)), 3)
        return dict(region=sil, exclude=M['face'] | M['hand'] | M['hair'] | M['beanie'] | M['owl'] | M['laptop'] | M['pencil'], clip=None,
                    mask_poly='body', light_mask=sil, soft=0.8)
    if name == 'nape':
        nape = grow(jsdata.mass_mask(jsdata.load('nape')['MASS']['ground'], (H, W)), 2) & ~M['hairmass']
        return dict(region=nape, exclude=M['hand'] | M['beanie'] | M['owl'] | M['laptop'], clip=None, mask_poly='nape', light_mask=nape)
    if name == 'pencil':
        return dict(region=grow(M['pencil'], 2), exclude=np.zeros((H, W), bool), clip=None, mask_poly='pencil', light_mask=grow(M['pencil'], 2))
    if name == 'laptop':
        return dict(region=grow(M['laptop'], 2), exclude=np.zeros((H, W), bool), clip=None, mask_poly='laptop', light_mask=grow(M['laptop'], 2), ground_mode='open')
    if name == 'room':
        # everything behind the figure and the owl: the whole frame minus the other layers' regions shrunk 6 px (so the
        # room runs a little under their edges and no old ground shows at a seam)
        body = jsdata.mass_mask(jsdata.load('body')['MASS']['sil'], (H, W))
        nape = jsdata.mass_mask(jsdata.load('nape')['MASS']['ground'], (H, W))
        fig = M['face'] | M['hand'] | grow(M['hairmass'], 3) | M['beanie'] | M['owl'] | M['laptop'] | grow(M['pencil'], 2) | body | nape
        figE = cv2.erode(fig.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))) > 0
        reg = ~figE
        return dict(region=reg, exclude=np.zeros((H, W), bool), clip=None, mask_poly='room', light_mask=reg, solids=None)
    if name == 'owl':
        return dict(region=M['owl'], exclude=np.zeros((H, W), bool), clip=None, mask_poly='owl', light_mask=M['owl'], soft=0.8)
    if name == 'owlhead':
        return dict(region=M['owlhead'], exclude=np.zeros((H, W), bool), clip=None, mask_poly='owlhead', light_mask=M['owlhead'], soft=0.8)
    raise SystemExit('unknown layer ' + name)


def r_(v, k): return round(float(v), k)


def enc_strokes(st, bright=False):
    """compact stroke encoding (enc 2): per stroke [tone*1000, x0*10, y0*10, w0*100, dx, dy, dw, ...] as integers
    (deltas of the quantised values). The per-point ground is folded into the width (drawInk's contrast ratio), so the
    film rebuilds each point as x, y, w, v, b with b = v +- 1 (ratio 1): the same strokes, 3 numbers a point."""
    rows = []
    for s_ in st:
        A = np.asarray(s_, np.float64).reshape(-1, 5)
        v = A[:, 3]; b = A[:, 4]
        vd = v.max() if bright else v.min()
        if bright: ratio = np.clip((v - b) / np.maximum(0.04, vd - b), 0, 1.5)
        else: ratio = np.clip((b - v) / np.maximum(0.04, b - vd), 0, 1.5)
        w = A[:, 2] * ratio
        q = np.round(np.column_stack([A[:, 0] * 10, A[:, 1] * 10, w * 100])).astype(np.int64)
        d = np.vstack([q[:1], np.diff(q, axis=0)])
        rows.append('[' + str(int(round(vd * 1000))) + ',' + ','.join(str(int(x)) for x in d.ravel()) + ']')
    return '[\n' + ',\n'.join(rows) + '\n]'


def enc_items(items):
    """compact outline encoding (enc 2): per item [v*1000, ring, ...], ring = [x0*2, y0*2, dx, dy, ...] integers (half-px)."""
    if not items: return '[]'
    out = []
    for it in items:
        rings = []
        for r in it[1:]:
            q = np.round(np.asarray(r, np.float64).reshape(-1, 2) * 2).astype(np.int64)
            d = np.vstack([q[:1], np.diff(q, axis=0)])
            rings.append('[' + ','.join(str(int(x)) for x in d.ravel()) + ']')
        out.append('[%d,%s]' % (int(round(it[0] * 1000)), ','.join(rings)))
    return '[\n' + ',\n'.join(out) + '\n]'


def mask_rings(m):
    """the outline of a mask (for a layer clip that is not a hand-made polygon), even-odd rings"""
    from region import rings_of
    return rings_of(m.astype(np.uint8), (0, 0), eps=0.7, mina=20, smooth=2, minhole=20)


def run(name, M):
    if '--export' in sys.argv: return export(name, M, json.load(open(os.path.join(OUT, f'{name}{SFX}.json'))))
    t0 = time.time()
    cfg = layer_cfg(name, M)
    opts = dict(DEFAULT_OPTS)
    if 'soft' in cfg: opts['soft'] = cfg['soft']
    kw = dict(KW); kw['ink_opts'] = opts
    for k in ('solids', 'ground_mode', 'ground_r', 'light_mask', 'light_passes', 'passes', 'stroke_mask', 'solid_dark', 'gblur'):
        if k in cfg: kw[k] = cfg[k]
    gi = cfg.get('ground_img')
    if gi: kw['ground_img'] = np.load(os.path.join(OUT, f'{gi}{SFX}_layer.npy'))
    box = bbox(cfg['region'])
    print(f'[{name}] box {box}')
    res = build(pre, cfg['region'], box, exclude=cfg['exclude'], **kw)
    report(name, res)
    cx0, cy0, cx1, cy1 = res['crop']
    Limg = np.ones((H, W), np.float32); Limg[cy0:cy1, cx0:cx1] = res['layer']
    np.save(os.path.join(OUT, f'{name}{SFX}_layer.npy'), Limg)
    a, b = res['render'], res['T']
    cv2.imwrite(os.path.join(OUT, f'{name}{SFX}-pair.jpg'), (np.clip(np.hstack([a, b]), 0, 1) * 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 92])
    J = {k: res[k] for k in ('ground', 'solids', 'ink', 'light')}; J['crop'] = [int(v) for v in res['crop']]
    json.dump(J, open(os.path.join(OUT, f'{name}{SFX}.json'), 'w'))
    export(name, M, J, t0)


def export(name, M, res, t0=None):
    t0 = t0 or time.time()
    cfg = layer_cfg(name, M)
    opts = dict(DEFAULT_OPTS)
    if 'soft' in cfg: opts['soft'] = cfg['soft']
    if 'crop' not in res:
        x0, y0, x1, y1 = [int(v) for v in bbox(cfg['region'])]; res['crop'] = [max(0, x0 - 24), max(0, y0 - 24), min(W, x1 + 24), min(H, y1 + 24)]
    clip = cfg['clip']
    frames = {'smile': '28.44-28.96 (the held smile)', 'neutral': '26.76-27.04 (neutral)'}.get(STATE, STATE)
    js = [f'// s06 r3 layer "{name}{SFX}": MEASURED on the source (mean of frames {frames}, ungraded with trace/grade.py) by',
          '// src/shots/s06/trace3/layers_r3.py: ground as nested value outlines (drawn crisp, blurred as a layer), solid',
          '// darks as outlines, pen strokes as centre-lines with a width per point and a tone (trace3.py), all calibrated by',
          '// analysis-by-synthesis against the source (fit.py). Outlines, centre-lines, widths and values only - no pixels.',
          '// Coordinates are pixel centres: the film draws them +0.5 px. enc 2: integer deltas (face3.js decodeR3).',
          'export const L = {',
          ' opts: ' + json.dumps(opts) + ', gblur: %g, sblur: 0.6,' % cfg.get('gblur', KW['gblur']),
          ' clip: ' + (json.dumps(clip) if clip else 'null') + ',',
          ' clipRings: ' + ('[' + ','.join('[' + ','.join('%g' % round(v, 1) for v in r) + ']' for r in mask_rings(cfg['region'])) + ']' if cfg.get('mask_poly') else 'null') + ',',
          ' box: ' + json.dumps(res['crop']) + ',',
          ' base: ' + ('%g' % res['ground']['base'] if res['ground'] else 'null') + ',',
          ' enc: 2,',
          ' ground: ' + (enc_items(res['ground']['items']) if res['ground'] else 'null') + ',',
          ' solids: ' + enc_items(res['solids']) + ',',
          ' ink: ' + enc_strokes(res['ink']) + ',',
          ' light: ' + enc_strokes(res['light'], bright=True) + ',',
          '};']
    p = os.path.join(DATA, f'r3_{name}{SFX}.js')
    open(p, 'w').write('\n'.join(js) + '\n')
    print(f'-> {p} {os.path.getsize(p) // 1024} KB {time.time() - t0:.1f} s')


if __name__ == '__main__':
    M = base_masks()
    args = sys.argv[1:]; names = []
    i = 0
    while i < len(args):
        if args[i] in ('--src', '--sfx', '--state'): i += 2; continue
        if not args[i].startswith('--'): names.append(args[i])
        i += 1
    for n in names: run(n, M)
