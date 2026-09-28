# ztrace.py MODE OUT.json F0 F1 [K] [params-json]: per-frame zone traces with a shared palette (measurement -> vectors)
#   MODE cd: the white owl's generous zone (C/D);  f: the colour owl's mask (F);  sc: the flung scissors (C/D)
import cv2, numpy as np, sys, json, re
from multiprocessing import Pool
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from vtrace import trace, pack, outline, fl
from gradeio import ungrade
import owlmask
MODE, OUT = sys.argv[1], sys.argv[2]; F0, F1 = int(sys.argv[3]), int(sys.argv[4]); K = int(sys.argv[5]) if len(sys.argv) > 5 else 28
P = dict(K=K, wink=True, inkbh=16, inkmax=215, inkq=16, eps=0.7, minarea=5)
if len(sys.argv) > 6: P.update(json.loads(sys.argv[6]))
SLAB = {}
if MODE == 'f':
    txt = open('/Users/computer/rootline/apprentice-film/archive/prev-builds/s26-end1-prev/s26/slabE.js').read()
def slabpoly(F):
    m = re.search(r'%d: \{ poly: (\[\[.*?\]\])' % F, txt) if MODE == 'f' else None
    return np.array(json.loads(m.group(1)), np.float32) if m else None
def getzone(F):
    if MODE == 'cd': return owlmask.zone(F)
    if MODE == 'sc': return owlmask.sczone(F)
    z, _ = owlmask.fmask(F)
    sp = slabpoly(F)
    if sp is not None:
        sm = np.zeros_like(z); cv2.fillPoly(sm, [np.int32(sp)], 1); z[cv2.erode(sm, np.ones((9, 9), np.uint8)) > 0] = 0
    return z
def prep(F):
    f = owlmask.src(F); U = ungrade(f, F / 25); U8 = np.clip(U * 255 + 0.5, 0, 255).astype(np.uint8)
    z = getzone(F); ys, xs = np.nonzero(z)
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
    r, i = pack(regs, inks)
    return F, [r, i, zo]
if __name__ == '__main__':
    Fs = list(range(F0, F1 + 1))
    with Pool(12) as pool:
        S = np.concatenate(pool.map(samp, Fs[::2]))
        cv2.setRNGSeed(5)
        _, _, cen = cv2.kmeans(np.float32(S), K, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 60, 0.2), 4, cv2.KMEANS_PP_CENTERS)
        res = pool.map(run, [(F, cen.tolist()) for F in Fs])
    json.dump({'centres': cen.tolist(), 'params': P, 'frames': {F: v for F, v in res}}, open(OUT, 'w'), separators=(',', ':'))
    print('done', len(res))
