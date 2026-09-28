# ztrace2.py OUT.json F0 F1 'zone-json' 'params-json' [K]: per-frame colour-owl traces (round 2 zone, shared palette)
import cv2, numpy as np, sys, json
from multiprocessing import Pool
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix2-tools')
from vtrace import trace, pack, outline, fl
from gradeio import ungrade
import owlmask as o
from zone2 import fzone
OUT = sys.argv[1]; F0, F1 = int(sys.argv[2]), int(sys.argv[3]); Z = json.loads(sys.argv[4])
P = dict(K=28, wink=True, inkbh=16, inkmax=215, inkq=16, eps=0.7, minarea=5)
P.update(json.loads(sys.argv[5]))
def prep(F):
    f = o.src(F); U8 = np.clip(ungrade(f, F / 25) * 255 + 0.5, 0, 255).astype(np.uint8)
    z = fzone(F, **Z); ys, xs = np.nonzero(z)
    x0, x1, y0, y1 = max(0, xs.min() - 4), min(2206, xs.max() + 5), max(0, ys.min() - 4), min(946, ys.max() + 5)
    return F, U8[y0:y1, x0:x1], z[y0:y1, x0:x1], (x0, y0)
def samp(F):
    F, u, z, off = prep(F)
    lab, mk = trace(u, z, off, dict({k: v for k, v in P.items() if k != 'base'}, labonly=True))
    yy, xx = np.nonzero(mk); rs = np.random.RandomState(F)
    i = rs.choice(len(yy), min(len(yy), 15000), replace=False)
    return lab[yy[i], xx[i]]
def run(args):
    F, cen = args
    F, u, z, off = prep(F)
    regs, inks = trace(u, z, off, dict(P, centres=cen))
    zo = [fl(p) for p in outline(z, off, 1.0)]
    r, i = pack(regs, inks)
    return F, [r, i, zo]
if __name__ == '__main__':
    Fs = list(range(F0, F1 + 1))
    with Pool(12) as pool:
        S = np.concatenate(pool.map(samp, Fs[::2] if len(Fs) > 3 else Fs))
        cv2.setRNGSeed(5)
        _, _, cen = cv2.kmeans(np.float32(S), P['K'], None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 60, 0.2), 4, cv2.KMEANS_PP_CENTERS)
        res = pool.map(run, [(F, cen.tolist()) for F in Fs])
    json.dump({'centres': cen.tolist(), 'params': P, 'zone': Z, 'frames': {F: v for F, v in res}}, open(OUT, 'w'), separators=(',', ':'))
    print('done', len(res))
