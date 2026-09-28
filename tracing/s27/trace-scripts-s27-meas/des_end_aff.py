# Designer end phase: 6-dof affine of the 125.0 designer edges fitted by chamfer to each frame 127.6 -> 129.28.
import cv2, numpy as np, json
from scipy.optimize import least_squares
from chamfer import edge_dt, sample
from common import *
g=cv2.GaussianBlur(load(125.0,True),(3,3),0); e=cv2.Canny(g,40,100)
pts=json.load(open('sil125.json')); m=np.zeros_like(e); cv2.fillPoly(m,[np.int32(np.round(pts))],255)
m=cv2.erode(m,np.ones((5,5),np.uint8)); e[m==0]=0
# add the silhouette itself (strong weight)
ys,xs=np.nonzero(e); P=np.c_[xs,ys].astype(float)[::3]
sil=np.array(pts,float); S=[]
for a,b in zip(sil,np.roll(sil,-1,0)):
    L=np.hypot(*(b-a)); n=max(1,int(L/4)); S+= [a+(b-a)*u for u in np.linspace(0,1,n,endpoint=False)]
S=np.array(S); S=S[(S[:,0]>2)&(S[:,1]<940)]
def ap(p,Q): a,b,c,d,tx,ty=p; return np.c_[a*Q[:,0]+b*Q[:,1]+tx, c*Q[:,0]+d*Q[:,1]+ty]
dc=json.load(open('des_ctrl.json')); G=np.array(dc['grid']); F=np.array(dc['frames']['127.6'])
M,_=cv2.estimateAffine2D(G.astype(np.float32),F.astype(np.float32)); p=np.r_[M[0,0],M[0,1],M[1,0],M[1,1],M[0,2],M[1,2]]
out={}
for t in times(127.6,129.28,0.04):
    dt=edge_dt(t)
    def res(q):
        A=ap(q,P); B=ap(q,S)
        ia=(A[:,0]>2)&(A[:,0]<2203)&(A[:,1]>2)&(A[:,1]<943); ib=(B[:,0]>2)&(B[:,0]<2203)&(B[:,1]>2)&(B[:,1]<943)
        return np.r_[np.where(ia,sample(dt,A),0), 2*np.where(ib,sample(dt,B),0)]
    sol=least_squares(res,p,loss='soft_l1',f_scale=3,x_scale=[0.01,0.01,0.01,0.01,5,5],diff_step=1e-4)
    p=sol.x; out[str(t)]=p.tolist()
    print(t,np.round(p,3).tolist(),'mean %.2f'%np.mean(res(p)),flush=True)
json.dump(out,open('des_end_aff.json','w'))
