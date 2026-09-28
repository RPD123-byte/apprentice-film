# roomvis.py : room plate error (blurred sigma 8, un-graded) over the parts visible while the card stands, as a 12x5
# grid; plus the lit-floor error. Target: the lit composite (57.32/57.36) outside the card, owl-free.
import sys; sys.path.insert(0, '.')
from lab import *
L = Lab(); im = L.dev('room', {'lit': True}); L.close()
R = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
T = np.load('../s19b-study/ungr_lit.npy')
q = np.array([[1093, 87], [1578, 51], [1687, 803], [996, 774]], np.int32)
m = np.ones(R.shape, np.uint8); cv2.fillPoly(m, [q], 0); m = cv2.erode(m, np.ones((61, 61), np.uint8)).astype(bool)
b = lambda x: cv2.GaussianBlur(x, (0, 0), 8)
d = (b(R) - b(T)) * 255
print('visible total', round(float(np.abs(d[m]).mean()), 2))
xs = np.linspace(0, 2206, 13).astype(int); ys = np.linspace(0, 946, 6).astype(int)
for j in range(5):
    row = []
    for i in range(12):
        mm = m[ys[j]:ys[j + 1], xs[i]:xs[i + 1]]; c = d[ys[j]:ys[j + 1], xs[i]:xs[i + 1]]
        row.append(f'{c[mm].mean():+5.0f}/{np.abs(c[mm]).mean():3.0f}' if mm.mean() > 0.2 else '    -    ')
    print(f'{ys[j]:4d} ' + ' '.join(row))
print('x:  ' + ' '.join(f'{x:9d}' for x in xs[:-1]))
