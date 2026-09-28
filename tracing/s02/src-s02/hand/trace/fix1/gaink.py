import sys, numpy as np
from run import Lab, src, mae
fr=[int(v) for v in sys.argv[1].split(',')]; ks=[float(v) for v in sys.argv[2].split(',')]
L=Lab()
for k in ks:
    L.js('(o)=>window.__labset(o)',{'gainK':k})
    out=[mae(L.frame(f,True)[0],src(f))[0] for f in fr]
    print(k,' '.join('%.2f'%v for v in out),'mean %.3f'%np.mean(out),flush=True)
L.close()
