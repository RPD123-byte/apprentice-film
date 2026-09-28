import numpy as np, os, cv2
from grade import ungrade
from segm import L
def P(f):
    fn=f'pcache/{f}.npy'
    if os.path.exists(fn): return np.load(fn).astype(np.float32)
    p=ungrade((L(f)[...,::-1]/255.0).astype(np.float32),f/25).mean(2)
    return p
