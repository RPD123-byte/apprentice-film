# depthtm.py : inverse depth w at R40 points by scale-compensated template matching 40.00 -> t (source only)
import numpy as np, cv2, sys
from src import frame
DOLLY=[0,0.03,0.06,0.091,0.1221,0.1714,0.2052,0.2395,0.2726,0.3076,0.3413,0.3769,0.4122,0.4495,0.4857,0.5223,0.549]
C=np.array([1104.5,642.9])
F0=frame(40.0).astype(np.float32)
pts=[tuple(map(float,p.split(','))) for p in sys.argv[1].split(';')]
times=[float(x) for x in sys.argv[2].split(',')]
winit=float(sys.argv[3]) if len(sys.argv)>3 else 1.0
R=22
for t in times:
    k=int(round((t-40)/0.04)); d=DOLLY[k]; Ft=frame(t).astype(np.float32)
    out=[]
    for (x,y) in pts:
        best=None
        for w in np.arange(0.7,1.6,0.01):
            Wh=1-d*w
            if Wh<0.2: break
            m=1/Wh; X=C+(np.array([x,y])-C)*m
            if not (R*m+2<X[0]<2206-R*m-2 and R*m+2<X[1]<946-R*m-2): continue
            tpl=F0[int(y-R):int(y+R),int(x-R):int(x+R)]
            tpl=cv2.resize(tpl,None,fx=m,fy=m,interpolation=cv2.INTER_LINEAR)
            h,ww=tpl.shape; x0=int(X[0]-ww/2); y0=int(X[1]-h/2)
            patch=Ft[y0:y0+h,x0:x0+ww]
            if patch.shape!=tpl.shape: continue
            a=tpl-tpl.mean(); b=patch-patch.mean(); s=(a*b).sum()/np.sqrt((a*a).sum()*(b*b).sum()+1e-6)
            if best is None or s>best[0]: best=(s,w)
        out.append(f'({x:.0f},{y:.0f}) w={best[1]:.2f} r={best[0]:.2f}' if best else f'({x:.0f},{y:.0f}) -')
    print(t,' '.join(out))
