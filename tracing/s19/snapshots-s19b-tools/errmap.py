# errmap.py t1,t2,... : blurred graded error per region (a grid of 6x3 cells) and a heat map image
import sys; sys.path.insert(0, '.')
from lab import *
import numpy as np, cv2
ts = [float(v) for v in sys.argv[1].split(',')]
L = Lab()
acc = None
for t in ts:
    r = cv2.cvtColor(L.render(t), cv2.COLOR_BGR2GRAY).astype(np.float32); s = src(t, True).astype(np.float32)
    rb = cv2.GaussianBlur(r, (0, 0), 8); sb = cv2.GaussianBlur(s, (0, 0), 8)
    d = rb - sb
    acc = d if acc is None else acc + d
    print(f'{t:.2f} mae {np.abs(d).mean():.2f}')
    xs = np.linspace(0, 2206, 7).astype(int); ys = np.linspace(0, 946, 4).astype(int)
    for j in range(3):
        print('   ' + ' '.join(f'{d[ys[j]:ys[j+1], xs[i]:xs[i+1]].mean():+6.1f}/{np.abs(d[ys[j]:ys[j+1], xs[i]:xs[i+1]]).mean():4.1f}' for i in range(6)))
L.close()
acc /= len(ts)
im = np.clip(128 + acc * 3, 0, 255).astype(np.uint8)
cv2.imwrite('../s19b-study/errmap.jpg', cv2.resize(cv2.applyColorMap(im, cv2.COLORMAP_JET), None, fx=0.5, fy=0.5))
