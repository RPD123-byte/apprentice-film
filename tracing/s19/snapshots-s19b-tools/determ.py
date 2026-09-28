import sys; sys.path.insert(0, '.')
from lab import *
ts = [57.64, 58.32, 59.80, 60.60, 61.68, 62.52]
A = Lab(); a = {t: A.render(t, False) for t in ts}; A.close()
B = Lab(rebuild=False); b = {t: B.render(t, False) for t in reversed(ts)}
b2 = {t: B.render(t, False) for t in ts}; B.close()
for t in ts: print(t, 'max diff fwd/rev', int(np.abs(a[t].astype(int) - b[t].astype(int)).max()), 'rerender', int(np.abs(a[t].astype(int) - b2[t].astype(int)).max()))
