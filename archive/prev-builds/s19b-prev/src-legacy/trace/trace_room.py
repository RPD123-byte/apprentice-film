# Trace the s19 room plate (C) and the lit floor (A, card standing) into drawable layers:
#   base  : broad lit areas (bright features wider than ~9 px), posterised into even-odd rings per level
#   dark  : dark strokes inside the broad lit areas (drawn 'darken')
#   bright: the scratchboard's white strokes (drawn 'lighten')
# Usage: trace_room.py plates.npz out.json [dbg prefix]
import sys, os, json, time, numpy as np, cv2
from ridges import trace
from render import render
E = lambda k, d: float(os.environ.get(k, d))
D = np.load(sys.argv[1]); out = sys.argv[2]; dbg = sys.argv[3] if len(sys.argv) > 3 else None
C = D['C'].astype(np.float32); A = D['A'].astype(np.float32)
H, W = C.shape
yy, xx = np.mgrid[0:H, 0:W]
def layer(P, mask, name):
    t0 = time.time()
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(E('OPEN', 9)),) * 2)
    base = cv2.GaussianBlur(cv2.morphologyEx(P, cv2.MORPH_OPEN, k), (0, 0), E('BBLUR', 3.0)) * mask
    STEP = E('STEP', 0.04)
    B = []
    for lv in np.arange(STEP * 1.5, 1.0, STEP):
        m = (base > lv).astype(np.uint8)
        m4 = cv2.resize(m, (W * 4, H * 4), interpolation=cv2.INTER_NEAREST)      # contours on pixel edges, not centres
        cs, hier = cv2.findContours(m4, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
        rings = []
        for c in cs:
            if abs(cv2.contourArea(c)) < 16 * 16: continue
            a = cv2.approxPolyDP(c, E('EPS', 1.1) * 4, True)[:, 0, :]
            if len(a) >= 3: rings.append(np.round((a + 0.5) / 4, 2).tolist())
        if rings: B.append([round(float(lv + STEP / 2), 3), rings])
    lit = (cv2.GaussianBlur(base, (0, 0), 2) > 0.16).astype(np.uint8) * mask
    dark = trace(P, lit, polarity=-1, sigmas=(0.9, 1.4, 2.2), hi=E('DHI', 0.05), lo=E('DLO', 0.02), minlen=6, psf=E('PSF', 0.7))
    bright = trace(P, mask, polarity=1, sigmas=(0.9, 1.4, 2.2, 3.4), hi=E('HI', 0.02), lo=E('LO', 0.008), minlen=6, psf=E('PSF', 0.7), basemap=base)
    print(name, 'base rings', sum(len(r) for _, r in B), 'dark', len(dark), 'bright', len(bright), round(time.time() - t0, 1), 's')
    return {'base': B, 'dark': dark, 'bright': bright, '_base': base}
def gain(strokes, g, basemap):
    # scale each stroke's ink above the broad base tone under it (strokes on the lit base stay as measured)
    out = []
    for s in strokes:
        q = []
        for x, y, w, v in s:
            b = float(basemap[min(H - 1, max(0, int(y))), min(W - 1, max(0, int(x)))])
            vv = b + (v - b) * g if v > b else v
            q.append([x, y, round(w * max(1.0, vv), 2) if vv > 1 else w, round(min(1.0, vv), 3)])
        out.append(q)
    return out
def calibrate(lay, ref, msk, n=6):
    basemap = lay.pop('_base')
    # the tracer misses faint strokes and the spine smoothing trims peaks: scale the strokes' ink so the
    # blurred render matches the blurred plate over the stroke areas (one constant per layer)
    G = 1.0; src = lay['bright']
    for it in range(n):
        lay['bright'] = gain(src, G, basemap)
        R = render(lay)
        br = cv2.GaussianBlur(R, (0, 0), 8); bs = cv2.GaussianBlur(ref, (0, 0), 8)
        m = (bs > 0.02) & (msk > 0)
        r = bs[m].sum() / br[m].sum(); G *= r
        print('  calib', it, 'ratio', round(float(r), 3), 'G', round(float(G), 3))
    lay['bright'] = gain(src, G, basemap); lay['gain'] = round(float(G), 3)
    return lay
room = calibrate(layer(C, np.ones((H, W), np.float32), 'room'), C, np.ones((H, W)))
fm = ((yy > 768) & (D['paper'] == 0)).astype(np.float32)
litf = calibrate(layer(A, fm, 'lit'), A, fm)
json.dump({'room': room, 'lit': litf}, open(out, 'w'))
print('json MB', round(len(open(out).read()) / 1e6, 2))
if dbg:
    R = render(room); Rl = render(litf); RA = np.where(fm > 0, np.maximum(R, Rl), R)
    for nm, r, ref, msk in [('C', R, C, np.ones((H, W))), ('A', RA, A, 1 - D['paper'])]:
        br = cv2.GaussianBlur(r, (0, 0), 8); bs = cv2.GaussianBlur(ref, (0, 0), 8)
        print(nm, 'blurMAE*255', round(float((np.abs(br - bs) * msk).sum() / msk.sum() * 255), 2), 'mean', round(float(r.mean() * 255), 1), round(float(ref.mean() * 255), 1))
        im = np.hstack([np.clip(r * 255, 0, 255), np.clip(ref * 255, 0, 255)]).astype(np.uint8)
        cv2.imwrite(f'{dbg}-{nm}.png', im)
