import cv2, numpy as np, json
from scipy.optimize import least_squares
from chamfer import edge_dt, sample
from common import *
g=cv2.GaussianBlur(load(125.0,True),(3,3),0); e=cv2.Canny(g,40,100)
m=np.zeros_like(e); poly=np.int32([[0,250],[450,220],[620,90],[1000,110],[1080,420],[1040,690],[900,720],[760,800],[640,946],[0,946]])
cv2.fillPoly(m,[poly],255); e[m==0]=0
ys,xs=np.nonzero(e); pts=np.c_[xs,ys].astype(float)
pts=pts[::4]
bw=json.load(open('des_bwd.json'))
def M_at(t): return np.array(bw['tracks'][str(t)]['M'])
def apply(p,P):
    s,r,tx,ty=p; c,sn=s*np.cos(r),s*np.sin(r); return np.c_[c*P[:,0]-sn*P[:,1]+tx, sn*P[:,0]+c*P[:,1]+ty]
M=M_at(122.4); s0=np.sqrt(abs(np.linalg.det(M[:,:2]))); p=np.array([s0,np.arctan2(M[1,0],M[0,0]),M[0,2],M[1,2]])
out={}
for t in times(120.6,122.4,0.04)[::-1]:
    dt=edge_dt(t)
    def res(q):
        Q=apply(q,pts); v=sample(dt,Q); inside=(Q[:,0]>2)&(Q[:,0]<2203)&(Q[:,1]>2)&(Q[:,1]<943)
        v=np.where(inside,v,0.0); return v
    sol=least_squares(res,p,loss='soft_l1',f_scale=3,x_scale=[0.01,0.005,5,5],diff_step=1e-4)
    Q=apply(sol.x,pts); inside=((Q[:,0]>2)&(Q[:,0]<2203)&(Q[:,1]>2)&(Q[:,1]<943)).sum()
    p=sol.x; out[str(t)]=p.tolist()
    print(t,'s=%.3f r=%.3f tx=%.0f ty=%.0f'%tuple(p),'inside',inside,'mean %.2f'%(res(p).sum()/max(1,inside)),flush=True)
json.dump(out,open('des_entry.json','w'))
