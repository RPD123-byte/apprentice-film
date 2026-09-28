import sys, json; sys.path.insert(0, '.')
from common import *
from beat import process
from multiprocessing import Pool
MH = np.load('maskH.npy'); MJ = np.load('maskJ.npy')
JSH = {82: (0.25, 0.11), 83: (1.78, 1.38), 84: (3.76, 2.91), 85: (4.72, 3.74), 86: (5.85, 4.67), 87: (7.94, 6.41), 88: (10.15, 8.23),
       89: (11.29, 9.13), 90: (12.46, 9.97), 91: (12.47, 9.96)}
# ECC (template k75 -> frame): x' = A x + t
JEC = {68: (-0.661, (-4.757614, 12.382385)), 69: (-0.685, (-5.024985, 12.709356))}
def grow(m, g=6): return cv2.dilate(m.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * g + 1,) * 2))
def occ_for(k):
    if k in (54, 57, 58, 59, 60, 61, 62): return grow(MH)
    if 63 <= k <= 67: return grow(np.load(f'maskW{k}.npy'))
    if k in JEC:
        a, t = JEC[k]; r = np.radians(a)
        A = np.float32([[np.cos(r), -np.sin(r), t[0]], [np.sin(r), np.cos(r), t[1]]])
        return grow(cv2.warpAffine(MJ, A, (2206, 946), flags=cv2.INTER_NEAREST), 8)
    dx, dy = JSH.get(k, (0.0, 0.0))
    return grow(cv2.warpAffine(MJ, np.float32([[1, 0, dx], [0, 1, dy]]), (2206, 946), flags=cv2.INTER_NEAREST))
def job(k): return process(k, occ_for(k))
if __name__ == '__main__':
    ks = [int(a) for a in sys.argv[1:]] or [54, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 75, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91]
    with Pool(8) as p:
        for r in p.imap_unordered(job, ks): print(r, flush=True)
