import numpy as np, cv2
from scipy.optimize import least_squares
from pose import *
Hs=load_H()
S=30.4/2206
XC=1084*S; YH=1163*S
def world_to_screen(P,phi):
    u=np.array([0,np.cos(phi),-np.sin(phi)]); n=np.array([0,np.sin(phi),np.cos(phi)])
    s=P@u; d=P@n
    return np.c_[P[:,0]+XC, YH-s, -d]
def project(P,t,phi):
    R,tv,_=pose_from_H(Hs[t])
    Q=world_to_screen(P,phi)
    X=(R@Q.T).T+tv
    return np.c_[F*X[:,0]/X[:,2]+CX, F*X[:,1]/X[:,2]+CY]
obs=[ # t, which, x, y   ; which: FLT front-left-top, FRT, BLT, BRT, FLB (bottom)
 (119.0,'FLT',545,774),(119.0,'FRT',1622,774),(119.0,'FLB',556,801),(119.0,'FRB',1612,801),
 (125.0,'FRT',1075,750),(125.0,'FLT',1044,666),(125.0,'BRT',1667,752),(125.0,'FRB',1085,781),(125.0,'BRB',1660,782),
]
def pts(p):
    phi,D,T,W,z0=p
    return {'FLT':[-W/2,0,D],'FRT':[W/2,0,D],'BLT':[-W/2,0,z0],'BRT':[W/2,0,z0],'FLB':[-W/2,-T,D],'FRB':[W/2,-T,D],'BLB':[-W/2,-T,z0],'BRB':[W/2,-T,z0]}
def res(p):
    P=pts(p); r=[]
    for t,w,x,y in obs:
        q=project(np.array([P[w]],float),t,p[0])[0]; r+= [q[0]-x,q[1]-y]
    return np.array(r)
p0=[np.radians(15),22,1.5,32.4,0]
sol=least_squares(res,p0)
print('phi=%.1f deg D=%.2f T=%.2f W=%.2f z0=%.2f'%(np.degrees(sol.x[0]),*sol.x[1:]))
print(res(sol.x).reshape(-1,2).round(1))
