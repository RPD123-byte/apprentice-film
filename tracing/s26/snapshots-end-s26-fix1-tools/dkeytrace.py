# dkeytrace.py OUT.json KEYS [params]: trace the D ring keys (meas/dkeys/kK.png inside mK.png) (measurement -> vectors)
import cv2, numpy as np, sys, json
from multiprocessing import Pool
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from vtrace import trace, pack, outline, fl
D = '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-meas/dkeys/'
OUT = sys.argv[1]; KEYS = [int(k) for k in sys.argv[2].split(',')]
P = dict(K=28, wink=True, inkq=24, eps=0.7, minarea=5)
if len(sys.argv) > 3: P.update(json.loads(sys.argv[3]))
def run(K):
    U8 = cv2.imread(D + f'k{K}.png'); m = (cv2.imread(D + f'm{K}.png', 0) > 0).astype(np.uint8)
    regs, inks = trace(U8, m, (0, 0), P)
    R, I = pack(regs, inks)
    return K, [R, I, []]
if __name__ == '__main__':
    with Pool(8) as pool: res = pool.map(run, KEYS)
    json.dump({'params': P, 'keys': KEYS, 'frames': {K: v for K, v in res}}, open(OUT, 'w'), separators=(',', ':'))
    for K, v in res: print(K, 'regions', len(v[0]), 'inks', sum(len(x) - 1 for x in v[1]))
