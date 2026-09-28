import sys, numpy as np
from lib import *
box = (1525, 262, 1650, 350)
def crop(I):
    x0, y0, x1, y1 = box
    return cv2.GaussianBlur(I.astype(np.float32), (0, 0), 1.5)[y0:y1, x0:x1].reshape(-1)
def prog(F, F0, F1):
    d = F1 - F0
    return float(np.dot(F - F0, d) / np.dot(d, d))
d = sys.argv[1]
ts = [139.0 + 0.04 * i for i in range(1, 11)]
S0, S1 = crop(src(139.0)), crop(src(139.6))
R0, R1 = crop(ren(139.0, d)), crop(ren(139.6, d))
print('t      src   ren   facediff')
for t in ts:
    s = prog(crop(src(t)), S0, S1); r = prog(crop(ren(t, d)), R0, R1)
    print(f'{t:.2f}  {s:.2f}  {r:.2f}  {bdiff(ren(t,d), src(t), box, 3):.2f}')
