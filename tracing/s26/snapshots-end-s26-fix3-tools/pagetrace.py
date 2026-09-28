# pagetrace.py OUT.js [params-json]: end fix round 3 — trace the settled colour page as the source shows it (the clean
# page: end-s26-fix1-meas/cleanpage.png, the median of 17 late frames of s26 moved by the arrival camera, no owl), made
# pre-grade (gradeio.ungrade, flicker 1), on a 2x-upsampled copy in 4x2 overlapping tiles with one shared palette.
# Writes a data module for s26 (s26/pageTraceF.js). Measurement -> vectors only; no pixel of the source is stored.
import cv2, numpy as np, sys, json, os
from multiprocessing import Pool
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from vtrace import trace, pack
import gradeio
from codec import deep
OUT = sys.argv[1]
UP = 2
P = dict(K=64, wink=True, inkbh=20, inkmax=200, inkq=8, eps=0.9, minarea=10, smooth=1.2, inkk=7, inkmin=16,
         inkarea=3.0, inkeps=0.6, inksmooth=0.9, winkk=7, winkarea=24, vote=3, hg=6, hc=7, chaikin=2,
         base=dict(K=16, minarea=60, eps=2, smooth=3, blur=6))
if len(sys.argv) > 2: P.update(json.loads(sys.argv[2]))
NX, NY, M, OV = int(os.environ.get('NX', 4)), int(os.environ.get('NY', 2)), 16, 2
_fl = gradeio.flicker
gradeio.flicker = lambda t: 1.0  # the median page: flicker averaged out
CLEAN = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-meas/cleanpage.png')
U8 = np.clip(gradeio.ungrade(CLEAN, 116.0) * 255 + 0.5, 0, 255).astype(np.uint8)
H, W = U8.shape[:2]
xs = np.linspace(0, W, NX + 1).round().astype(int); ys = np.linspace(0, H, NY + 1).round().astype(int)
TILES = [(xs[i], ys[j], xs[i + 1], ys[j + 1]) for j in range(NY) for i in range(NX)]
def prep(tile):
    x0, y0, x1, y1 = tile
    cx0, cy0, cx1, cy1 = max(0, x0 - M), max(0, y0 - M), min(W, x1 + M), min(H, y1 + M)
    u = cv2.resize(U8[cy0:cy1, cx0:cx1], None, fx=UP, fy=UP, interpolation=cv2.INTER_CUBIC)
    z = np.zeros((cy1 - cy0, cx1 - cx0), np.uint8)
    z[max(0, y0 - OV) - cy0:min(H, y1 + OV) - cy0, max(0, x0 - OV) - cx0:min(W, x1 + OV) - cx0] = 1
    z = cv2.resize(z, None, fx=UP, fy=UP, interpolation=cv2.INTER_NEAREST)
    return u, z, (cx0, cy0)
def samp(tile):
    u, z, _ = prep(tile)
    lab, mk = trace(u, z, (0, 0), dict({k: v for k, v in P.items() if k != 'base'}, labonly=True))
    yy, xx = np.nonzero(mk); rs = np.random.RandomState(tile[0] * 7 + tile[1])
    i = rs.choice(len(yy), min(len(yy), 40000), replace=False)
    return lab[yy[i], xx[i]]
def chaikin(p, n):
    for _ in range(n):
        q = np.roll(p, -1, 0); p = np.stack([0.75 * p + 0.25 * q, 0.25 * p + 0.75 * q], 1).reshape(-1, 2)
    return p
def run(args):
    tile, cen = args
    u, z, off = prep(tile)
    regs, inks = trace(u, z, (0, 0), dict(P, centres=cen))
    off = np.array(off, float)
    tf = lambda p, n: (chaikin(np.asarray(p, float), n) if n else np.asarray(p, float)) / UP + off
    regs = [[a / UP / UP, c, tf(o, 0), [tf(h, 0) for h in hs]] for a, c, o, hs in regs]
    inks = {c: [[tf(o, P['chaikin']), [tf(h, P['chaikin']) for h in hs]] for o, hs in ps] for c, ps in inks.items()}
    return pack(regs, inks)
if __name__ == '__main__':
    with Pool(8) as pool:
        S = np.concatenate(pool.map(samp, TILES))
        cv2.setRNGSeed(5)
        _, _, cen = cv2.kmeans(np.float32(S), P['K'], None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 60, 0.2), 4, cv2.KMEANS_PP_CENTERS)
        res = pool.map(run, [(t, cen.tolist()) for t in TILES])
    R = [r for rr, _ in res for r in rr]; I = [i for _, ii in res for i in ii]
    row = json.dumps(deep([R, I]), separators=(',', ':'))
    open(OUT, 'w').write(
        "// s26 D-F: the settled colour page as the source shows it, traced (end fix round 3; approved traced geometry,\n"
        "// STYLE.md 2026-09-27): the median of 17 late s26 frames moved by the arrival camera (no owl), made pre-grade, traced on\n"
        "// a 2x-upsampled copy in 4 x 2 overlapping tiles with one 64-colour palette (an underpaint of a blurred copy, Chaikin-\n"
        "// smoothed ink), polygons scaled back by 0.5. [regions, inks] as in owlTraceCD.js (page px x2, codec.js strings).\n"
        "// Written by snapshots/end-s26-fix3-tools/pagetrace.py; painted once by s26.js (its own copy of the colour page).\n"
        f"export const PAGE_T = {row};\n")
    print(OUT, len(row), 'regions', len(R), 'inkgroups', len(I))
