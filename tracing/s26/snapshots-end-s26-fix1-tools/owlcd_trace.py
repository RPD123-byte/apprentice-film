# owlcd_trace.py OUT.json F0 F1 [K]: per-frame traces of the white owl's zone (C/D), shared palette (measurement -> vectors)
import cv2, numpy as np, sys, json, time
from multiprocessing import Pool
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from vtrace import trace, pack, outline, fl
from gradeio import ungrade
from owlmask import zone, src
OUT = sys.argv[1]; F0, F1 = int(sys.argv[2]), int(sys.argv[3]); K = int(sys.argv[4]) if len(sys.argv) > 4 else 28
P = dict(K=K, wink=True, inkbh=16, inkmax=215, inkq=16, eps=0.7, minarea=5)
def prep(F):
    f = src(F); U = ungrade(f, F / 25); U8 = np.clip(U * 255 + 0.5, 0, 255).astype(np.uint8)
    z = zone(F); ys, xs = np.nonzero(z)
    x0, x1, y0, y1 = max(0, xs.min() - 4), min(2206, xs.max() + 5), max(0, ys.min() - 4), min(946, ys.max() + 5)
    return F, U8[y0:y1, x0:x1], z[y0:y1, x0:x1], (x0, y0)
def samp(F):
    F, u, z, off = prep(F)
    lab, mk = trace(u, z, off, dict(P, labonly=True))
    yy, xx = np.nonzero(mk); rs = np.random.RandomState(F)
    i = rs.choice(len(yy), min(len(yy), 15000), replace=False)
    return lab[yy[i], xx[i]]
def run(args):
    F, cen = args
    F, u, z, off = prep(F)
    regs, inks = trace(u, z, off, dict(P, centres=cen))
    zo = [fl(o) for o in outline(z, off, 1.0)]
    return F, pack(regs, inks), zo
if __name__ == '__main__':
    Fs = list(range(F0, F1 + 1))
    with Pool(12) as pool:
        S = np.concatenate(pool.map(samp, Fs[::2]))
        cv2.setRNGSeed(5)
        _, _, cen = cv2.kmeans(np.float32(S), K, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 60, 0.2), 4, cv2.KMEANS_PP_CENTERS)
        print('palette', K, flush=True)
        res = pool.map(run, [(F, cen.tolist()) for F in Fs])
    json.dump({"centres": cen.tolist(), "frames": {F: [pk[0], pk[1], zo] for F, pk, zo in res}}, open(OUT, 'w'), separators=(',', ':'))
    print('done', len(res))
