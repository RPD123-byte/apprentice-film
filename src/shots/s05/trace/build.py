#!/usr/bin/env python3
# s05 ink build (measurement pipeline; its output is ../data/*.js, drawn by ../ink.js). Not loaded by the film.
#  1. target frames: the settled frame (frames.static_target, ungraded) and, under the sliding right hand, 24.24 s
#  2. layer masks (masks.py)
#  3. per layer: ink strokes traced as centre-lines with width + value (ridges.py; bright and dark lines), and a value
#     study = the frame with the strokes taken out, filled/extended under the layers in front, smoothed, and cut into
#     nested iso-value regions (polygons). No pixels are stored: polygons and stroke centre-lines only.
import numpy as np, cv2, json, pickle, os, sys, time
import frames
from ridges import ridge_paths
from fill import pushpull, smooth_in
from strokefit import stroke_layers, fit_base, fit_strokes, joint_values
H, W = 946, 2206
CACHE = frames.CACHE
ORDER = ['room', 'desk', 'lh', 'rh', 'arm', 'fig', 'owl']        # back to front (the settled frame, pose A of the hand)
LAYERS = ORDER[:4] + ['rhB'] + ORDER[4:5] + ['armB'] + ORDER[5:] + ['owlD']
# who is in front of whom (for how far a layer runs on under the others)
FRONT = {'room': ['desk', 'lh', 'rh', 'arm', 'fig', 'owl'], 'desk': ['lh', 'rh', 'arm', 'fig', 'owl'], 'lh': ['rh', 'arm', 'fig', 'owl'],
         'rh': ['arm', 'fig', 'owl'], 'arm': ['fig', 'owl'], 'fig': ['owl'], 'owl': [], 'rhB': ['armB', 'fig', 'owl'], 'armB': ['fig', 'owl'], 'owlD': []}
SCREEN = np.array([[315, 246], [834, 168], [898, 519], [409, 648]], np.float64)
# how far each layer continues under the layers in front of it (px), and its canvas box (frame px)
EXTEND = {'room': 10000, 'desk': 90, 'lh': 30, 'rh': 30, 'arm': 70, 'fig': 10000, 'owl': 0, 'rhB': 30, 'armB': 70, 'owlD': 0}
BOX = {'room': (-60, -80, 2366, 986), 'desk': (-60, 120, 1720, 986), 'lh': (540, 600, 920, 930), 'rh': (800, 560, 1260, 820),
       'arm': (1120, 580, 1640, 840), 'fig': (740, -80, 2366, 1006), 'owl': (1360, 170, 1820, 740),
       'rhB': (840, 540, 1300, 800), 'armB': (1160, 570, 1680, 830), 'owlD': (1360, 170, 1820, 740)}
LEVEL_STEP = 0.025
BASE_SIGMA = float(os.environ.get('BASE_SIGMA', 2.0))
ITERS = 2
JOINT = int(os.environ.get('JOINT', 0))
RESID = float(os.environ.get('RESID', 0))
SOFT_B = float(os.environ.get('SOFT', 0))
CHUNK = 10

def split(strokes, n=None):
    """cut long strokes into chunks of about n points (each gets its own value); returns (chunks, caps): only the
    stroke's real ends taper"""
    n = n or CHUNK
    out, caps = [], []
    for s in strokes:
        if len(s) <= n + 2: out.append(s); caps.append((True, True)); continue
        k = int(np.ceil((len(s) - 1) / n)); step = (len(s) - 1) / k
        idx = [int(round(i * step)) for i in range(k + 1)]
        for j, (a, b) in enumerate(zip(idx[:-1], idx[1:])): out.append(s[a:b + 1]); caps.append((j == 0, j == k - 1))
    return out, caps
PAR_B = float(os.environ.get('HIB', 1.0))    # threshold scale for the white lines
PAR = dict(hi=float(os.environ.get('HI', 0.06)), lo=float(os.environ.get('LO', 0.03)), minlen=float(os.environ.get('MINLEN', 4)))

def dil(m, r): return cv2.dilate(m.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*r+1, 2*r+1))) > 0
def ero(m, r): return cv2.erode(m.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*r+1, 2*r+1))) > 0

def crop(img, box):
    x0, y0, x1, y1 = box
    top, left = max(0, -y0), max(0, -x0)
    p = cv2.copyMakeBorder(img, top, max(0, y1 - H), left, max(0, x1 - W), cv2.BORDER_REPLICATE)
    return p[y0 + top: y1 + top, x0 + left: x1 + left]

def iso_regions(B, region, step, eps=0.9):
    """nested iso-value regions of B inside region: [(value, [rings])] (rings in B's pixel coords: pixel (i, j) is the
    square [i, i+1) x [j, j+1)), sub-pixel marching squares on the smooth value study; fill even-odd per level"""
    from skimage.measure import find_contours
    from ridges import rdp
    Bp = np.pad(np.where(region, B, -1.0), 1, constant_values=-1.0)
    out = []
    lv = step
    while lv < 1:
        if not ((B >= lv) & region).any(): break
        rings = []
        for c in find_contours(Bp, lv):
            if len(c) < 4: continue
            P = c[:, ::-1] - 1 + 0.5            # (row, col) -> (x, y), undo the pad, pixel centres
            area = 0.5 * abs(np.dot(P[:-1, 0], P[1:, 1]) - np.dot(P[1:, 0], P[:-1, 1]))
            if area < 3: continue
            Q = np.array(rdp(P[:-1], eps) if len(P) > 8 else P[:-1], np.float32)
            if len(Q) >= 3: rings.append(Q)
        if rings: out.append((lv + step / 2, rings))
        lv += step
    return out

def build(only=None):
    t0 = time.time()
    S = frames.static_target(); Ys = S.mean(2).astype(np.float32)
    M = dict(np.load(f'{CACHE}/masks.npz'))
    scr = np.zeros((H, W), np.uint8); cv2.fillPoly(scr, [np.round(SCREEN).astype(np.int32)], 1); scr = ero(scr > 0, 3)
    front = {n: np.zeros((H, W), bool) for n in LAYERS}
    for n, fs in FRONT.items():
        for f in fs: front[n] |= M[f]
    SB = frames.poseB().mean(2).astype(np.float32)
    DP = frames.dip_target().mean(2).astype(np.float32)
    u606 = frames.pre(606).mean(2).astype(np.float32)
    sh = lambda m, dx, dy: cv2.warpAffine(m.astype(np.uint8), np.float32([[1, 0, dx], [0, 1, dy]]), (W, H)) > 0
    occB = M['rhB'] | M['armB'] | M['fig'] | M['owl'] | M['lh']
    # 24.24: the hand (pose B) at +68.1,-23.0 = pose B + (25.1, -6.0); the forearm at +64.3,-7.0 = B + (24.3, -2.0)
    occ606 = sh(M['rhB'], 25.1, -6.0) | sh(M['armB'], 24.3, -2.0) | M['fig'] | M['owl'] | M['lh']
    gain = lambda U, occ: np.median(Ys[M['desk'] & ~dil(occ, 3)] / np.maximum(U[M['desk'] & ~dil(occ, 3)], 1e-3))
    gB, g606 = gain(SB, occB), gain(u606, occ606)
    print('gains', gB, g606)
    res = {}
    for name in LAYERS:
        if only and name not in only: continue
        box = tuple(int(v) for v in os.environ['XBOX'].split(',')) if os.environ.get('XBOX') else BOX[name]; x0, y0, x1, y1 = box
        vis = M[name].copy()
        T = SB.copy() if name in ('rhB', 'armB') else DP.copy() if name == 'owlD' else Ys.copy()
        if name == 'fig':
            # behind the owl's head: what its dip (26.00-26.08) uncovers
            exD = M['owl'] & ~dil(M['owlD'], 4) & ~M['fig']
            T[exD] = DP[exD]; vis |= exD
        if name == 'desk':
            # where the hand and forearm sweep: take each pixel from the frame that shows it clear of both (5 px margin),
            # pose B first (it is on screen most), then the settled frame (pose A), then 24.24; the rest is filled in
            sweep = dil(M['rh'] | M['arm'] | M['rhB'] | M['armB'] | sh(M['rhB'], 25.1, -6.0) | sh(M['armB'], 24.3, -2.0), 30) & ~M['fig'] & ~M['owl'] & ~M['lh']
            cA = ~dil(M['rh'] | M['arm'], 5); cB = ~dil(occB, 5); c6 = ~dil(occ606, 5)
            T[sweep & cB] = SB[sweep & cB] * gB
            rest = sweep & ~cB & c6 & ~cA
            T[rest] = u606[rest] * g606
            vis = (M['desk'] & ~sweep) | (sweep & (cA | cB | c6))
        if name in ('room', 'desk', 'fig') and os.path.exists(f'{CACHE}/settle_fill.npz'):
            # what the camera settle uncovers (settle_fill.py): only dark room content is trusted (behind the figure the
            # room is dark; lighter values there are the face or owl leaking through the motion masks)
            SF = np.load(f'{CACHE}/settle_fill.npz'); fv, fw = SF[name], SF[name + '_w'] > 0
            if name == 'room': fv, fw = fv[80:80 + H, 60:60 + W], fw[80:80 + H, 60:60 + W]   # (the part inside the frame; the rest below)
            hid = fw & ~vis
            if name == 'fig': hid &= M['owl']
            if name == 'desk': hid &= ~(M['fig'] | M['owl']) | (fv < 0.55)     # under the figure only the darker desk
            if name == 'room': hid &= fv < 0.4
            hid = ero(hid, 2)
            T[hid] = fv[hid]; vis |= hid
        if name == 'desk': vis &= ~scr
        ext = dil(M[name], EXTEND[name]) & (front[name] | M[name]) if EXTEND[name] < 10000 else (front[name] | M[name])
        if name == 'desk': ext = (ext | dil(M[name], 2)) & ~scr | (dil(M['desk'], 4) & scr)  # the screen area stays in the layer (drawn over)
        if name == 'room': ext = np.ones((H, W), bool)
        if name == 'fig':
            # the owl's lower-left overhangs the desk, not his shoulder: at 23.12-23.20 the desk shows there once the
            # owl has moved off it (flow of the source settle frames), so the figure does not run on under it
            nf = np.zeros((H, W), np.uint8); cv2.fillPoly(nf, [np.array([[1430, 530], [1495, 552], [1535, 600], [1560, 660], [1560, 740], [1380, 740], [1380, 530]], np.int32)], 1)
            ext &= ~((nf > 0) & M['owl'])
        # crop to box
        Tc, vc, ec = crop(T, box), crop(vis.astype(np.uint8), box) > 0, crop(ext.astype(np.uint8), box) > 0
        if name == 'room':   # the room continues past the frame edges (camera settle): what the settle frames show there
            ec[:] = True
            SF = np.load(f'{CACHE}/settle_fill.npz'); fv, fw = SF['room'], SF['room_w'] > 0
            outside = np.ones(Tc.shape, bool); outside[80:80 + H, 60:60 + W] = False
            ok = outside & fw & (fv < 0.6)
            Tc = np.where(outside, np.where(ok, fv, 0.04), Tc).astype(np.float32); vc = np.where(outside, ok, vc)
        known = ero(vc, 1); tmask = known.copy()
        if name == 'room':
            # far from anything seen the hidden room falls to the room's black (not the grey of a smooth fill)
            far = cv2.distanceTransform((~known).astype(np.uint8), cv2.DIST_L2, 5) > 30
            Tc = np.where(far, 0.04, Tc).astype(np.float32); known = known | far
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
            if it == 0 and RESID > 0:
                # a second pass: ink lines the first set missed, traced on what is left (target - drawing)
                R_ = B * a + s
                if SOFT_B > 0: R_ = cv2.GaussianBlur(R_, (0, 0), SOFT_B)
                res_img = np.clip(Tc - R_ + 0.5, 0, 1).astype(np.float32)
                for pol in (1, -1):
                    S2, _ = ridge_paths(res_img, pol, RESID, RESID / 2, minlen=PAR['minlen'], mask=tmask.astype(np.float32))
                    # values measured on the target itself: re-sample the profile peak there
                    S2c, c2 = split(S2)
                    for s2 in S2c:
                        from ridges import bilinear
                        s2[:, 3] = bilinear(cv2.GaussianBlur(Tc, (0, 0), 0.6), s2[:, 0] - 0.5, s2[:, 1] - 0.5)
                    strokes[pol] += S2c; caps[pol] += c2
                    vals[pol] += [float(np.mean(q[:, 3])) for q in S2c]; wsc[pol] += [1.0] * len(S2c)
                print(name, 'residual strokes', sum(len(v) for v in strokes.values()), flush=True)
                a, s = stroke_layers(Tc.shape, strokes, vals, wsc, caps)
        if not JOINT:
            a, s = stroke_layers(Tc.shape, strokes, vals, wsc, caps)
            B = fit_base(Tc, a, s, known, ec, sigma=BASE_SIGMA)
        lv = iso_regions(B, dil(ec, 5), LEVEL_STEP)
        base0 = LEVEL_STEP / 2
        # alpha rings of the layer (extent), in box coords
        cs, _ = cv2.findContours(ec.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
        alpha = [cv2.approxPolyDP(c, 0.6, True)[:, 0, :].astype(np.float32) + 0.5 for c in cs if abs(cv2.contourArea(c)) > 20]
        res[name] = dict(T=Tc, soft=float(os.environ.get('SOFT', 0)), box=box, strokes=strokes, caps=caps, vals=vals, wsc=wsc, levels=lv, alpha=alpha, base=B, base0=base0, ext=ec, vis=vc)
        print(name, 'strokes', len(strokes[1]), len(strokes[-1]), 'levels', len(lv), sum(len(r) for _, rr in lv for r in rr), 'verts', f'{time.time() - t0:.1f}s', flush=True)
    return res

if __name__ == '__main__':
    only = sys.argv[1].split(',') if len(sys.argv) > 1 else None
    res = build(only)
    for k, v in res.items():
        pickle.dump(v, open(f'{CACHE}/layer_{k}{os.environ.get("XTAG", "")}.pkl', 'wb'))
