import sys
from lab import *
import numpy as np
L = Lab(); res = []
for k in range(1433, 1578):
    t = k / 25; r = L.render(t); s = src(t); res.append((t, mae(r, s, 8)))
L.close()
a = np.array([m for _, m in res])
print('mean', a.mean().round(2), 'max', a.max().round(2), 'at', res[int(a.argmax())][0])
for i in range(0, len(res), 5): print(' '.join(f'{t:.2f}:{m:.1f}' for t, m in res[i:i+5]))
