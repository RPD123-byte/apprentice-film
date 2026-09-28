# pb.py: pull-back experiments: for each config, render frames and print sharpness ratios + σ6 MAE
import sys, json, cv2, numpy as np, os
sys.path.insert(0,'.')
from lab import *
H,W=946,2206; yy,xx=np.mgrid[0:H,0:W]; far=np.hypot(xx-865,yy-341)>800
def lap(im):
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32); g=cv2.GaussianBlur(g,(0,0),0.7)
    return np.abs(cv2.Laplacian(g,cv2.CV_32F,ksize=3))
ts=[float(x) for x in sys.argv[1].split(',')]
cfgs=json.loads(sys.argv[2]); out=sys.argv[3] if len(sys.argv)>3 else None
L=Lab()
S={t:src(t) for t in ts}; LS={t:lap(S[t]) for t in ts}
for ci,c in enumerate(cfgs):
    rows=[]
    for t in ts:
        f=L.frame(t,True,None,c); lr=lap(f); ls=LS[t]
        rows.append((t,lr.mean()/ls.mean(),lr[far].mean()/ls[far].mean(),mae(f,S[t]),mae(f,S[t],2)))
        if out: os.makedirs(out,exist_ok=True); cv2.imwrite(f'{out}/c{ci}_{t:.2f}.png',f)
    print(json.dumps(c))
    for r in rows: print('  t=%.2f all %.3f far %.3f mae6 %.2f mae2 %.2f'%r)
    a=np.array([r[1:] for r in rows]); print('  mean all %.3f far %.3f mae6 %.2f mae2 %.2f'%tuple(a.mean(0)),flush=True)
L.close()
