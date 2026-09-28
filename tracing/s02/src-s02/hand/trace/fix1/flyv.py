import sys, json, numpy as np, cv2
from run import Lab, src, mae
fr=[int(v) for v in sys.argv[1].split(',')]; cands=json.loads(sys.argv[2])
L=Lab()
for c in cands:
    L.js('(o)=>window.__flyv(o)',c)
    out=[mae(L.frame(f,True)[0],src(f))[0] for f in fr]
    print(json.dumps(c),' '.join('%.2f'%v for v in out),'mean %.3f'%np.mean(out),flush=True)
L.close()
