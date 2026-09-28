import sys; sys.path.insert(0, '.')
from lab import *
L = Lab()
import time
for t in [57.40, 58.80, 60.60, 61.36, 62.20, 63.00]:
    a = time.time(); r = L.render(t); s = src(t)
    print(t, 'mae', round(mae(r, s), 2), round(time.time() - a, 2))
    pair(r, s, f'../s19b-study/old_{t:.2f}.jpg', 0.4)
L.close()
