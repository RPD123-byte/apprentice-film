import sys; sys.path.insert(0,'.')
from lab import *
import numpy as np
L=Lab()
ts=[k/25 for k in range(1433,1578)]
d=np.array(L.js('(ts) => S19.timeit2(ts)', ts))
idx=np.argsort(-d)[:25]
print(' '.join(f'{ts[i]:.2f}:{d[i]:.0f}' for i in sorted(idx)))
L.close()
