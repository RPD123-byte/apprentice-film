import sys, subprocess; sys.path.insert(0,'.')
import lab
from lab import *
import numpy as np
D=lab.D
r=subprocess.run([lab.ESB, f'{D}/entry-orig.js','--bundle','--format=iife',f'--outfile={D}/bundle.js','--log-level=error'],capture_output=True,text=True); print(r.stderr[:500])
L=Lab(rebuild=False)
ts=[k/25 for k in range(1433,1578)]
d=np.array(L.js('(ts) => S19.timeit2(ts)', ts))
print('ORIG first %.0f median %.0f p90 %.0f max %.0f'%(d[0],np.median(d),np.percentile(d,90),d.max()))
L.close()
