import cv2, numpy as np, time
from common import *
def fbfrac(fw, bw, th=1.0):
    h, w = fw.shape[:2]; ys, xs = np.mgrid[0:h:4, 0:w:4]
    f = fw[ys, xs]; x2 = np.clip(np.round(xs + f[..., 0]).astype(int), 0, w - 1); y2 = np.clip(np.round(ys + f[..., 1]).astype(int), 0, h - 1)
    b = bw[y2, x2]; e = np.hypot(f[..., 0] + b[..., 0], f[..., 1] + b[..., 1]); return (e < th).mean()
for a, b in [(1030, 1031), (1052, 1053), (1082, 1083), (1098, 1099), (1108, 1109)]:
    A = cv2.imread(f'{SRC}/f{a}.png', 0); B = cv2.imread(f'{SRC}/f{b}.png', 0)
    for name, preset in [('ultra', cv2.DISOPTICAL_FLOW_PRESET_ULTRAFAST), ('fast', cv2.DISOPTICAL_FLOW_PRESET_FAST), ('medium', cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)]:
        for sc in [1, 2]:
            dis = cv2.DISOpticalFlow_create(preset)
            a2 = cv2.resize(A, None, fx=1 / sc, fy=1 / sc, interpolation=cv2.INTER_AREA); b2 = cv2.resize(B, None, fx=1 / sc, fy=1 / sc, interpolation=cv2.INTER_AREA)
            t0 = time.time(); fw = dis.calc(a2, b2, None); bw = dis.calc(b2, a2, None)
            print(a, name, sc, f'{fbfrac(fw, bw, 1.0 / sc):.2f}', f'{fbfrac(fw, bw, 2.0/sc):.2f}', f'{time.time()-t0:.1f}s')
    # farneback
    t0 = time.time()
    fw = cv2.calcOpticalFlowFarneback(A, B, None, 0.5, 6, 25, 5, 7, 1.5, 0); bw = cv2.calcOpticalFlowFarneback(B, A, None, 0.5, 6, 25, 5, 7, 1.5, 0)
    print(a, 'farneback', f'{fbfrac(fw, bw):.2f}', f'{fbfrac(fw, bw, 2):.2f}', f'{time.time()-t0:.1f}s')
