# roomgrid.py [lit]: blurred (sigma 8) error of the un-graded room plate vs target, on a 12x5 grid of cells, worst first
import sys; sys.path.insert(0, '.')
from lab import *
import numpy as np, cv2
lit = len(sys.argv) > 1 and sys.argv[1] == 'lit'
L = Lab(); im = L.dev('room', {'lit': lit}); L.close()
R = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
T = np.load('../s19b-study/ungr_lit.npy' if lit else '../s19b-study/ungr_comp.npy')
b = lambda x: cv2.GaussianBlur(x, (0, 0), 8)
d = (b(R) - b(T)) * 255
print('total', round(float(np.abs(d).mean()), 2))
xs = np.linspace(0, 2206, 13).astype(int); ys = np.linspace(0, 946, 6).astype(int)
cells = []
for j in range(5):
    row = []
    for i in range(12):
        c = d[ys[j]:ys[j + 1], xs[i]:xs[i + 1]]; row.append(f'{c.mean():+5.0f}/{np.abs(c).mean():3.0f}'); cells.append((np.abs(c).mean(), xs[i], ys[j]))
    print(f'{ys[j]:4d} ' + ' '.join(row))
print('x:  ' + ' '.join(f'{x:9d}' for x in xs[:-1]))
