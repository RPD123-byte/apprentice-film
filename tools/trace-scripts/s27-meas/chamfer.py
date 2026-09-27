import cv2, numpy as np, json
from scipy.optimize import least_squares
from common import *
F=2520.; CX,CY=1103.,473.
def edge_dt(t):
    g=cv2.GaussianBlur(load(t,True),(3,3),0); e=cv2.Canny(g,40,100)
    return cv2.distanceTransform(255-e,cv2.DIST_L2,3)
def rrect(x0,x1,z0,z1,r,n=24):
    pts=[]
    L=[(x0+r,z0,x1-r,z0),(x1,z0+r,x1,z1-r),(x1-r,z1,x0+r,z1),(x0,z1-r,x0,z0+r)]
    C=[(x1-r,z0+r,-np.pi/2),(x1-r,z1-r,0),(x0+r,z1-r,np.pi/2),(x0+r,z0+r,np.pi)]
    for (ax,az,bx,bz),(cx,cz,a0) in zip(L,C):
        for u in np.linspace(0,1,n,endpoint=False): pts.append((ax+(bx-ax)*u,az+(bz-az)*u))
        for u in np.linspace(0,np.pi/2,6,endpoint=False): pts.append((cx+r*np.cos(a0+u),cz+r*np.sin(a0+u)))
    return np.array(pts)
def rect(x0,x1,z0,z1,n=20):
    pts=[]
    for (ax,az,bx,bz) in [(x0,z0,x1,z0),(x1,z0,x1,z1),(x1,z1,x0,z1),(x0,z1,x0,z0)]:
        for u in np.linspace(0,1,n,endpoint=False): pts.append((ax+(bx-ax)*u,az+(bz-az)*u))
    return np.array(pts)
def model(sh):
    W,D,T,kw,kz0,kz1,tw,tz0,tz1=sh
    top=rrect(-W/2,W/2,0,D,1.0); top=np.c_[top[:,0],np.zeros(len(top)),top[:,1]]
    bot=rrect(-W/2+0.3,W/2-0.3,0.3,D-0.3,1.0); bot=np.c_[bot[:,0],np.full(len(bot),-T),bot[:,1]]
    kb=rect(-kw/2,kw/2,kz0,kz1); kb=np.c_[kb[:,0],np.zeros(len(kb)),kb[:,1]]
    tp=rect(-tw/2,tw/2,tz0,tz1); tp=np.c_[tp[:,0],np.zeros(len(tp)),tp[:,1]]
    return {'top':top,'bot':bot,'kb':kb,'tp':tp}
def proj(P,rv,tv):
    R,_=cv2.Rodrigues(np.asarray(rv,float)); X=(R@P.T).T+tv
    return np.c_[F*X[:,0]/X[:,2]+CX,F*X[:,1]/X[:,2]+CY],X[:,2]
def sample(dt,q):
    h,w=dt.shape; x=np.clip(q[:,0],0,w-1.001); y=np.clip(q[:,1],0,h-1.001)
    x0=x.astype(int); y0=y.astype(int); fx=x-x0; fy=y-y0
    v=dt[y0,x0]*(1-fx)*(1-fy)+dt[y0,x0+1]*fx*(1-fy)+dt[y0+1,x0]*(1-fx)*fy+dt[y0+1,x0+1]*fx*fy
    out=(q[:,0]<0)|(q[:,0]>w-1)|(q[:,1]<0)|(q[:,1]>h-1)
    v[out]=8.0
    return v
