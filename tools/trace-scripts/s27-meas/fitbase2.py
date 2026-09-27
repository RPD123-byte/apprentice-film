import numpy as np, cv2, json
from scipy.optimize import least_squares
d=json.load(open('screenT_118.0_129.3.json')); Hs={float(t):np.array(v['H']) for t,v in d.items()}
CX,CY=1103.,473.
S=30.4/2206; XC=1084*S; YH=1163*S
def pose(H,F):
    K=np.array([[F,0,CX],[0,F,CY],[0,0,1.]])
    gx,gy=np.meshgrid(np.linspace(0,2206,6),np.linspace(0,946,4))
    P=np.stack([gx.ravel(),gy.ravel()],1).astype(np.float32)
    I=cv2.perspectiveTransform(P[None],H)[0]
    O=np.c_[P*S,np.zeros(len(P))].astype(np.float32)
    ok,r,tv=cv2.solvePnP(O,I,K,None); R,_=cv2.Rodrigues(r); return R,tv.ravel()
def project(P,t,phi,F):
    R,tv=pose(Hs[t],F)
    u=np.array([0,np.cos(phi),-np.sin(phi)]); n=np.array([0,np.sin(phi),np.cos(phi)])
    Q=np.c_[P[:,0]+XC, YH-P@u, -(P@n)]
    X=(R@Q.T).T+tv
    return np.c_[F*X[:,0]/X[:,2]+CX, F*X[:,1]/X[:,2]+CY]
obs=[(119.0,'FLT',545,774),(119.0,'FRT',1622,774),(119.0,'FLB',556,801),(119.0,'FRB',1612,801),
 (125.0,'FRT',1075,750),(125.0,'FLT',1044,666),(125.0,'BRT',1667,752),(125.0,'FRB',1085,781),(125.0,'BRB',1660,782)]
def pts(p):
    phi,D,T,W,z0,F=p
    return {'FLT':[-W/2,0,D],'FRT':[W/2,0,D],'BLT':[-W/2,0,z0],'BRT':[W/2,0,z0],'FLB':[-W/2,-T,D],'FRB':[W/2,-T,D],'BLB':[-W/2,-T,z0],'BRB':[W/2,-T,z0]}
def res(p):
    P=pts(p); r=[]
    for t,w,x,y in obs:
        q=project(np.array([P[w]],float),t,p[0],p[5])[0]; r+=[q[0]-x,q[1]-y]
    return np.array(r)
for F0 in [1500,2520,4000]:
    sol=least_squares(res,[np.radians(15),22,1.5,32.4,0,F0])
    print('phi=%.1f D=%.2f T=%.2f W=%.2f z0=%.2f F=%.0f cost=%.0f'%(np.degrees(sol.x[0]),*sol.x[1:],sol.cost))
    print(res(sol.x).reshape(-1,2).round(1).tolist())
