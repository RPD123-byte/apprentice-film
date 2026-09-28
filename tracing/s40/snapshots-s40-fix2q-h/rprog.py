import sys
from lib import *
def crop(I, box):
    x0, y0, x1, y1 = box
    return cv2.GaussianBlur(I.astype(np.float32), (0, 0), 1.5)[y0:y1, x0:x1].reshape(-1)
def prog(F, F0, F1):
    d = F1 - F0; return float(np.dot(F - F0, d) / np.dot(d, d))
boxes = {'eyeL': (1538, 284, 1585, 325), 'eyeR': (1596, 286, 1642, 328), 'beak': (1560, 316, 1606, 350), 'browL': (1528, 266, 1590, 292), 'browR': (1590, 266, 1650, 296), 'band': (1510, 205, 1690, 260)}
d = sys.argv[1]
for nm, b in boxes.items():
    S0, S1, R0, R1 = crop(src(139.0), b), crop(src(139.6), b), crop(ren(139.0, d), b), crop(ren(139.6, d), b)
    out = []
    for t in [139.12, 139.16, 139.2, 139.24, 139.28, 139.32, 139.36]:
        out.append(f'{prog(crop(src(t), b), S0, S1):.2f}/{prog(crop(ren(t, d), b), R0, R1):.2f}')
    print(' ', nm, ' '.join(out))
