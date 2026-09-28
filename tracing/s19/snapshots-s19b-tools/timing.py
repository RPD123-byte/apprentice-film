import sys; sys.path.insert(0,'.')
from lab import *
L=Lab()
ts=[k/25 for k in range(1433,1578)]
r=np.array(L.js('(ts) => S19.timeit2(ts)', ts))
print('first %.0f median %.0f p90 %.0f max %.0f' % (r[0], np.median(r[1:]), np.percentile(r[1:],90), r[1:].max()))
slow=[(t,v) for t,v in zip(ts,r) if v>250]; print('slow>250:', ' '.join('%.2f:%.0f'%x for x in slow))
# second pass (caches warm, same order)
r2=np.array(L.js('(ts) => S19.timeit2(ts)', ts)); print('warm median %.0f p90 %.0f max %.0f' % (np.median(r2), np.percentile(r2,90), r2.max()))
L.close()
