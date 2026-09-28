# ptrace.py OUT.json F0 F1 [params-json]: end fix round 3 — re-trace the colour owl (s26 beat F) on a 2x-upsampled crop
# (measurement -> vectors only; nothing here is loaded by the film). The zone is the one already in owlTraceF.js (so the
# seam against the page does not move); the palette is shared over F0..F1 only (the perch frames get their own oranges);
# ink polygons (and optionally region polygons) are Chaikin-smoothed so eyes and rims are not stepped.
import cv2, numpy as np, sys, json
from multiprocessing import Pool
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from vtrace import trace, pack
from gradeio import ungrade
from codec import dec
import owlmask as o
ROOT = '/Users/computer/rootline/apprentice-film/'
OUT = sys.argv[1]; F0, F1 = int(sys.argv[2]), int(sys.argv[3])
UP = 2
# params in UPSAMPLED px (x2 of the original frame)
P = dict(K=36, wink=True, inkbh=16, inkmax=215, inkq=8, eps=0.9, minarea=10, smooth=1.2, inkk=11, inkmin=16,
         inkarea=3.0, inkeps=0.6, inksmooth=0.9, winkk=11, winkarea=24, vote=3, hg=6, hc=5, chaikin=2, rchaikin=0)
if len(sys.argv) > 4: P.update(json.loads(sys.argv[4]))
import os
MOD, NAME = os.environ.get('MOD', 'owlTraceF'), os.environ.get('NAME', 'OWL_F')  # which traced-frames module (zones)
L = open(ROOT + f'src/shots/s26/{MOD}.js').read().split('\n')
_i0 = next(i for i, l in enumerate(L) if l.startswith(f'export const {NAME} = [')) + 1
_f0 = next(int(l.split('=')[1].strip(' ;')) for l in L if l.startswith(f'export const {NAME}_F0'))
def row(F): return json.loads(L[_i0 + F - _f0].rstrip(','))
def zone(F):
    z = np.zeros((946, 2206), np.uint8)
    for s in row(F)[2]:
        p = np.array(dec(s), np.float64).reshape(-1, 2) / 2
        cv2.fillPoly(z, [np.int32(np.round(p * 16))], 1, shift=4)
    return z
def prep(F):
    f = o.src(F); U8 = np.clip(ungrade(f, F / 25) * 255 + 0.5, 0, 255).astype(np.uint8)
    z = zone(F); ys, xs = np.nonzero(z)
    x0, x1, y0, y1 = max(0, xs.min() - 6), min(2206, xs.max() + 7), max(0, ys.min() - 6), min(946, ys.max() + 7)
    u = cv2.resize(U8[y0:y1, x0:x1], None, fx=UP, fy=UP, interpolation=cv2.INTER_CUBIC)
    zz = (cv2.resize(z[y0:y1, x0:x1].astype(np.float32), None, fx=UP, fy=UP, interpolation=cv2.INTER_LINEAR) > 0.5).astype(np.uint8)
    return F, u, zz, (x0, y0), row(F)[2]
def chaikin(p, n):
    for _ in range(n):
        q = np.roll(p, -1, 0); p = np.stack([0.75 * p + 0.25 * q, 0.25 * p + 0.75 * q], 1).reshape(-1, 2)
    return p
def samp(F):
    F, u, z, off, _ = prep(F)
    lab, mk = trace(u, z, (0, 0), dict(P, labonly=True))
    yy, xx = np.nonzero(mk); rs = np.random.RandomState(F)
    i = rs.choice(len(yy), min(len(yy), 30000), replace=False)
    return lab[yy[i], xx[i]]
def run(args):
    F, cen = args
    F, u, z, off, zo = prep(F)
    regs, inks = trace(u, z, (0, 0), dict(P, centres=cen))
    tf = lambda p, n: chaikin(np.asarray(p, np.float64), n) / UP + off if n else np.asarray(p, np.float64) / UP + off
    regs = [[a / UP / UP, c, tf(ou, P['rchaikin']), [tf(h, P['rchaikin']) for h in hs]] for a, c, ou, hs in regs]
    inks = {c: [[tf(ou, P['chaikin']), [tf(h, P['chaikin']) for h in hs]] for ou, hs in ps] for c, ps in inks.items()}
    r, i = pack(regs, inks)
    return F, [r, i, zo]
if __name__ == '__main__':
    Fs = list(range(F0, F1 + 1))
    with Pool(10) as pool:
        S = np.concatenate(pool.map(samp, Fs[::2] if len(Fs) > 3 else Fs))
        cv2.setRNGSeed(5)
        _, _, cen = cv2.kmeans(np.float32(S), P['K'], None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 60, 0.2), 4, cv2.KMEANS_PP_CENTERS)
        res = pool.map(run, [(F, cen.tolist()) for F in Fs])
    json.dump({'centres': cen.tolist(), 'params': P, 'frames': {F: v for F, v in res}}, open(OUT, 'w'), separators=(',', ':'))
    print('done', len(res))
