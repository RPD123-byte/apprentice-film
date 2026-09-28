# vis2.py t : graded blurred error grid (render - source) for frame t, 12x5 cells, excluding the owl
import sys; sys.path.insert(0, '.')
from lab import *
t = float(sys.argv[1])
L = Lab(); r = cv2.cvtColor(L.render(t), cv2.COLOR_BGR2GRAY).astype(np.float32); o = L.devc('owlc', {'t': t}); L.close()
s = src(t, True).astype(np.float32)
owl = cv2.dilate((o[:, :, 3] > 30).astype(np.uint8), np.ones((41, 41), np.uint8)).astype(bool)
b = lambda x: cv2.GaussianBlur(x, (0, 0), 8)
d = b(r) - b(s); m = ~owl
print('total', round(float(np.abs(d).mean()), 2), 'non-owl', round(float(np.abs(d[m]).mean()), 2))
xs = np.linspace(0, 2206, 13).astype(int); ys = np.linspace(0, 946, 6).astype(int)
for j in range(5):
    row = []
    for i in range(12):
        mm = m[ys[j]:ys[j + 1], xs[i]:xs[i + 1]]; c = d[ys[j]:ys[j + 1], xs[i]:xs[i + 1]]
        row.append(f'{c[mm].mean():+5.0f}/{np.abs(c[mm]).mean():3.0f}' if mm.mean() > 0.2 else '    -    ')
    print(f'{ys[j]:4d} ' + ' '.join(row))
print('x:  ' + ' '.join(f'{x:9d}' for x in xs[:-1]))
