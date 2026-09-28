import sys, cv2, numpy as np
sys.path.insert(0,'.')
from lab import *
from owlm import om
L=Lab()
ts=[float(x) for x in sys.argv[1].split(',')]
names=sys.argv[2].split(',')
for name in ['none']+names:
    off={} if name=='none' else {k:1 for k in name.split('+')}
    v=[om(L.frame(t,dbg={'off':off}),src(t),t,1.5) for t in ts]
    print(name, ' '.join('%.2f'%x for x in v), 'mean %.3f'%np.mean(v), flush=True)
L.close()
