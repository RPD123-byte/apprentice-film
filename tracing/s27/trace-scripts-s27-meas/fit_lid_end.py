import cv2, numpy as np, json
from scipy.optimize import least_squares
from chamfer import edge_dt, rrect, sample
from common import *
Wl,Hl=2352.,1391.
SRC=np.float32([[0,0],[Wl,0],[Wl,Hl],[0,Hl]])   # TL TR BR BL (lid coords as seen from the front)
P=rrect(0,Wl,0,Hl,70,n=50)
K={128.8:[[1723,312],[1683,251],[1498,838],[1560,800]],128.96:[[1775,315],[1620,269],[1417,855],[1613,823]],
   129.12:[[1780,329],[1530,292],[1348,873],[1631,835]],129.28:[[1766,352],[1408,322],[1238,889],[1628,820]]}
def init(t):
    ks=sorted(K)
    if t<=ks[0]: return np.array(K[ks[0]],float)
    for a,b in zip(ks,ks[1:]):
        if a<=t<=b: u=(t-a)/(b-a); return np.array(K[a])*(1-u)+np.array(K[b])*u
    return np.array(K[ks[-1]],float)
def res(p,dt):
    H=cv2.getPerspectiveTransform(SRC,np.float32(p).reshape(4,2)); q=cv2.perspectiveTransform(np.float32(P)[None],H)[0]
    return sample(dt,q)
out={}
for t in times(128.8,129.28,0.04):
    c0=init(t).ravel(); dt=edge_dt(t)
    sol=least_squares(lambda p: np.r_[res(p,dt),0.03*(p-c0)],c0,loss='soft_l1',f_scale=2.0,diff_step=1e-3)
    out[str(t)]=sol.x.tolist(); print(t,'mean %.2f'%np.mean(res(sol.x,dt)),np.round(sol.x).astype(int).tolist())
json.dump(out,open('lid_end.json','w'))
