# Sequential chamfer fit of a planar rectangle outline (4 image corners), velocity-predicted.
# usage: fit_quad_seq.py t0 t1 step out.json x0 y0 x1 y1 x2 y2 x3 y3 [Wtex Dtex r]
import cv2, numpy as np, json, sys
from scipy.optimize import least_squares
from chamfer import edge_dt, rrect, sample
from common import *
t0,t1,st=float(sys.argv[1]),float(sys.argv[2]),float(sys.argv[3]); outfn=sys.argv[4]
c=np.array([float(v) for v in sys.argv[5:13]])
Wt,Dt,r=(float(sys.argv[13]),float(sys.argv[14]),float(sys.argv[15])) if len(sys.argv)>15 else (100.,60.,2.)
SRC=np.float32([[0,0],[Wt,0],[Wt,Dt],[0,Dt]])
P=rrect(0,Wt,0,Dt,r,n=40)
def res(p,dt):
    H=cv2.getPerspectiveTransform(SRC,np.float32(p).reshape(4,2)); q=cv2.perspectiveTransform(np.float32(P)[None],H)[0]
    return sample(dt,q)
n=int(round(abs(t1-t0)/st)); sgn=1 if t1>=t0 else -1
out={}; prev=None; prev2=None
for i in range(n+1):
    t=round(t0+sgn*i*st,2)
    c0=c if prev is None else (prev if prev2 is None else prev+(prev-prev2)*0.8)
    dt=edge_dt(t)
    sol=least_squares(lambda p: np.r_[res(p,dt),0.01*(p-c0)],c0,loss="soft_l1",f_scale=2.0,diff_step=1e-3)
    prev2=prev; prev=sol.x; out[str(t)]=sol.x.tolist()
    print(t,'mean %.2f'%np.mean(res(sol.x,dt)),np.round(sol.x).astype(int).tolist(),flush=True)
json.dump(out,open(outfn,'w'))
