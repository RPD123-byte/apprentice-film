import cv2, numpy as np, sys, os
from common import *
from concurrent.futures import ProcessPoolExecutor
OUT = FLOW + '2'; os.makedirs(OUT, exist_ok=True)
def job(ab):
    a, b = ab
    A = cv2.imread(f'{SRC}/f{a}.png', 0); B = cv2.imread(f'{SRC}/f{b}.png', 0)
    fw = cv2.calcOpticalFlowFarneback(A, B, None, 0.5, 6, 25, 5, 7, 1.5, 0); bw = cv2.calcOpticalFlowFarneback(B, A, None, 0.5, 6, 25, 5, 7, 1.5, 0)
    np.savez_compressed(f'{OUT}/fl_{a}_{b}.npz', fw=fw[::2, ::2].astype(np.float16), bw=bw[::2, ::2].astype(np.float16))
    return a
if __name__ == '__main__':
    pairs = list(zip(FRAMES[:-1], FRAMES[1:]))
    with ProcessPoolExecutor(8) as ex:
        for a in ex.map(job, pairs): pass
    print('done')
