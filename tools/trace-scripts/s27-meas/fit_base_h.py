# Base top plane as a homography per frame (4 corner image points), fitted by chamfer to Canny edges.
from chamfer import *
from pose import load_H
import sys
Hs=load_H()
W,D=32.4,22.5
def layout_pts(L):
    kw,kz0,kz1,tw,tz0,tz1=L
    top=rrect(-W/2,W/2,0,D,1.2,n=30)
    kb=rect(-kw/2,kw/2,kz0,kz1,n=24); tp=rect(-tw/2,tw/2,tz0,tz1,n=16)
    return top,kb,tp
SRC=np.float32([[-W/2,D],[W/2,D],[W/2,0],[-W/2,0]])  # FL FR BR BL
def Hof(c): return cv2.getPerspectiveTransform(SRC,np.float32(c).reshape(4,2))
def ph(H,P): return cv2.perspectiveTransform(np.float32(P)[None],H)[0]
def resid(c,L,dt,wt=(1,0.7,0.7)):
    H=Hof(c); r=[]
    for w,P in zip(wt,layout_pts(L)): r.append(w*sample(dt,ph(H,P)))
    return np.concatenate(r)
L0=[28.0,1.2,12.0,14.0,12.8,21.3]
def predict(c,t0,t1):
    M=Hs[t1]@np.linalg.inv(Hs[t0]); return ph(M,np.float32(c).reshape(4,2)).ravel()
if __name__=='__main__':
    c0=np.float32([[545,774],[1622,774],[1484,671],[683,669]]).ravel()
    ts=[round(x,2) for x in np.arange(119.6,128.41,0.2)]
    sols={}; c=c0; prev=None
    for t in ts:
        if prev is not None: c=predict(c,prev,t)
        dt=edge_dt(t)
        sol=least_squares(lambda p: np.r_[resid(p,L0,dt),0.05*(p-c)],c,loss='soft_l1',f_scale=3.0)
        c=sol.x; sols[t]=c.tolist(); prev=t
        print(t,'mean',round(float(np.mean(resid(c,L0,dt))),2),np.round(c).astype(int).tolist(),flush=True)
    json.dump({'layout':L0,'W':W,'D':D,'corners':sols},open('base_h.json','w'))
