# etrace.py OUT.json F0 F1: beat E per frame — the lens shard (front, coarse, painted blurred) and the rest of the
# non-page (the ring's last shards; back), both traced from the source; the owls are traced on their own (measurement)
import cv2, numpy as np, sys, json, re
from multiprocessing import Pool
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from vtrace import trace, pack, outline, fl
from gradeio import ungrade
import owlmask as o
OUT = sys.argv[1]; F0, F1 = int(sys.argv[2]), int(sys.argv[3])
txt = open('/Users/computer/rootline/apprentice-film/archive/prev-builds/s26-end1-prev/s26/slabE.js').read()
def slabpoly(F):
    m = re.search(r'%d: \{ poly: (\[\[.*?\]\])' % F, txt)
    return np.array(json.loads(m.group(1)), np.float32) if m else None
PB = dict(K=24, wink=True, inkq=24, eps=0.8, minarea=6, base={'blur': 3})
PF = dict(K=20, ink=False, wink=False, eps=1.2, minarea=30, smooth=1.5, vote=3, hc=12, bil=40)
def run(F):
    f = o.src(F); U8 = np.clip(ungrade(f, F / 25) * 255 + 0.5, 0, 255).astype(np.uint8)
    rm, _ = o.ringmask(F)
    sl = np.zeros((946, 2206), np.uint8); sp = slabpoly(F)
    if sp is not None: cv2.fillPoly(sl, [np.int32(sp)], 1)
    front = cv2.dilate(sl, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
    owl = np.zeros_like(sl)
    if F <= 2848: owl = o.zone(F)
    if F >= 2852: owl = o.fmask(F)[0]
    back = rm & (1 - front) & (1 - cv2.erode(owl, np.ones((9, 9), np.uint8)))
    back = cv2.morphologyEx(back, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    rb, ib = trace(U8, back, (0, 0), PB) if back.sum() > 200 else ([], {})
    # the front: traced from a blurred copy (it is out of focus)
    Ub = cv2.GaussianBlur(U8, (0, 0), 2.5)
    rf, _ = trace(Ub, front, (0, 0), PF) if front.sum() > 200 else ([], {})
    zo = [fl(p) for p in outline(front, (0, 0), 1.5)]
    B = pack(rb, ib); Fr = pack(rf, {})
    return F, [[B[0], B[1], []], [Fr[0], [], zo]]
if __name__ == '__main__':
    with Pool(12) as pool: res = pool.map(run, range(F0, F1 + 1))
    json.dump({'frames': {F: v for F, v in res}}, open(OUT, 'w'), separators=(',', ':'))
    for F, v in res: print(F, 'back', len(v[0][0]), 'front', len(v[1][0]))
