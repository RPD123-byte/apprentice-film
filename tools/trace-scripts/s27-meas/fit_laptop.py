from chamfer import *
from pose import pose_from_H, load_H
import sys
Hs=load_H()
S=30.4/2206; XC=1084*S; YH=1163*S
def init_pose(t,phi=np.radians(12)):
    R,tv,_=pose_from_H(Hs[t])
    A=np.array([[1,0,0],[0,-np.cos(phi),np.sin(phi)],[0,-np.sin(phi),-np.cos(phi)]])
    b=np.array([XC,YH,0])
    Rb=R@A; tb=R@b+tv
    return cv2.Rodrigues(Rb)[0].ravel(),tb
SH0=[32.4,22.0,1.4,28.5,1.0,11.5,13.0,13.0,20.5]
def resid(pose,sh,dt,w={'top':1,'bot':0.6,'kb':0.8,'tp':0.8}):
    M=model(sh); r=[]
    for k,P in M.items():
        q,z=proj(P,pose[:3],pose[3:]); r.append(w[k]*sample(dt,q))
    return np.concatenate(r)
if __name__=='__main__':
    ts=[119.6,121.0,122.0,123.0,124.0,125.0]
    dts={t:edge_dt(t) for t in ts}
    poses={}
    for t in ts:
        rv,tv=init_pose(t); p0=np.r_[rv,tv]
        sol=least_squares(lambda p: resid(p,SH0,dts[t]),p0,loss='soft_l1',f_scale=3.0,x_scale=np.r_[[0.02]*3,[1]*3])
        poses[t]=sol.x; print(t,'cost',round(sol.cost,1),'mean',round(np.mean(resid(sol.x,SH0,dts[t])),2))
    # joint shape fit
    n=len(ts)
    def J(p):
        sh=p[:9]; return np.concatenate([resid(p[9+6*i:15+6*i],sh,dts[t]) for i,t in enumerate(ts)])
    p0=np.r_[SH0,np.concatenate([poses[t] for t in ts])]
    sol=least_squares(J,p0,loss='soft_l1',f_scale=3.0,x_scale=np.r_[[0.5]*9,np.tile(np.r_[[0.02]*3,[1]*3],n)])
    sh=sol.x[:9]; print('shape',np.round(sh,2).tolist())
    for i,t in enumerate(ts): print(t,'mean',round(np.mean(resid(sol.x[9+6*i:15+6*i],sh,dts[t])),2))
    json.dump({'shape':sh.tolist(),'poses':{str(t):sol.x[9+6*i:15+6*i].tolist() for i,t in enumerate(ts)}},open('laptop_shape.json','w'))
