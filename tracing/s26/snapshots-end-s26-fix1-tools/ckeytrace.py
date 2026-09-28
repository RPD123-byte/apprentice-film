# ckeytrace.py OUT.json KEYS [params]: trace the C key backgrounds (meas/ckeys/kK.png, ungraded) full frame, minus the
# area every frame of the key's group covers with its own traced owl zone (measurement -> vectors)
import cv2, numpy as np, sys, json
from multiprocessing import Pool
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from vtrace import trace, pack
import owlmask as o
D = '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-meas/ckeys/'
OUT = sys.argv[1]; KEYS = [int(k) for k in sys.argv[2].split(',')]
P = dict(K=28, wink=True, inkq=24, eps=0.7, minarea=5)
if len(sys.argv) > 3: P.update(json.loads(sys.argv[3]))
SHAKE = 2795   # the double-exposed shake frame is its own key, used for itself only
def group(K):
    # frames drawn from key K: those nearer to K than to any other key (C frames 2790-2817)
    if K == SHAKE: return [SHAKE]
    return [F for F in range(2790, 2818) if F != SHAKE and min([k for k in KEYS if k != SHAKE], key=lambda k: (abs(k - F), k)) == K]
def run(K):
    U8 = cv2.imread(D + f'k{K}.png')
    cover = np.ones((946, 2206), np.uint8)
    for F in group(K):
        A = (o.M3(o.CAM[K]) @ np.linalg.inv(o.M3(o.CAM[F])))[:2]   # F-frame -> K-frame
        z = cv2.warpAffine(cv2.erode(o.zone(F), np.ones((13, 13), np.uint8)), A, (2206, 946), flags=cv2.INTER_NEAREST)
        cover &= z
    mask = (1 - cover).astype(np.uint8)
    regs, inks = trace(U8, mask, (0, 0), P)
    R, I = pack(regs, inks)
    return K, [R, I, []], group(K)
if __name__ == '__main__':
    with Pool(6) as pool: res = pool.map(run, KEYS)
    json.dump({'params': P, 'keys': KEYS, 'groups': {K: g for K, _, g in res}, 'frames': {K: v for K, v, _ in res}}, open(OUT, 'w'), separators=(',', ':'))
    for K, v, g in res: print(K, g, 'regions', len(v[0]), 'inks', sum(len(x) - 1 for x in v[1]))
