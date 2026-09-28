import sys; sys.path.insert(0,'.')
from lab import *
import numpy as np
L=Lab()
ts=[k/25 for k in range(1433,1578)]
d=L.js('(ts) => S19.timeit2(ts)', ts)
d=np.array(d); print('first %.0f median %.0f p90 %.0f max %.0f at %.2f'%(d[0],np.median(d),np.percentile(d,90),d.max(),ts[int(d.argmax())]))
# determinism: render 6 times forward, then reversed, compare
sel=[57.52,58.12,58.32,59.00,61.12,62.28,62.76]
A={t:L.render(t,False) for t in sel}
B={t:L.render(t,False) for t in reversed(sel)}
print('det maxdiff', max(int(np.abs(A[t].astype(int)-B[t].astype(int)).max()) for t in sel))
L.close()
