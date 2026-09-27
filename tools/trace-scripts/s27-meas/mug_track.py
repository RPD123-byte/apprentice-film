# Mug: chamfer-fit a cylinder outline (body rect with elliptic rim and base) per frame. params cx, ytop, w, h.
import cv2, numpy as np, json, sys
from scipy.optimize import least_squares
from chamfer import edge_dt, sample
from common import *
def model(p, ry_k=0.075):
    cx,yt,w,h=p; ry=w*ry_k; pts=[]
    a=np.linspace(0,2*np.pi,60,endpoint=False)
    pts+=list(zip(cx+w/2*np.cos(a), yt+ry*np.sin(a)))                    # rim ellipse
    b=np.linspace(0,np.pi,30); pts+=list(zip(cx+w/2*np.cos(b), yt+h+ry*np.sin(b)))   # base front arc
    for y in np.linspace(yt,yt+h,25): pts+=[(cx-w/2,y),(cx+w/2,y)]
    return np.array(pts)
def fit(t,p0,reg=0.02):
    dt=edge_dt(t)
    f=lambda p: np.r_[sample(dt,model(p)), reg*(p-p0)]
    s=least_squares(f,p0,loss='soft_l1',f_scale=2,diff_step=1e-3)
    return s.x, float(np.mean(sample(dt,model(s.x))))
t0,t1=float(sys.argv[1]),float(sys.argv[2]); p=np.array([float(v) for v in sys.argv[3:7]]); outfn=sys.argv[7]
step=0.04 if t1>t0 else -0.04; n=int(round(abs(t1-t0)/0.04)); out={}; prev=None
for i in range(n+1):
    t=round(t0+i*step,2)
    p0=p if prev is None else p+(p-prev)*0.7
    q,e=fit(t,p0); prev=p; p=q; out[str(t)]=q.tolist()
    print(t,np.round(q,1).tolist(),'err %.2f'%e,flush=True)
json.dump(out,open(outfn,'w'))
