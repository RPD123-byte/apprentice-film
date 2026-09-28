# Lid pose from the screen homography (f fixed), and a hinged base: fit the opening angle, the base depth and its
# lateral extent to base corners measured on gridded source frames.
import json, numpy as np
from scipy.optimize import least_squares
S={round(r[0],2):np.array(r[1:]).reshape(3,3) for r in json.load(open('../s27d-meas/screen.json'))}
for r in json.load(open('../s27d-meas/screen2.json')):
    if r[0]>=122.0: S[round(r[0],2)]=np.array(r[1:]).reshape(3,3)
F=2500.; cx,cy=1103.,473.
K=np.array([[F,0,cx],[0,F,cy],[0,0,1]]); Ki=np.linalg.inv(K)
def pose(H):
    A=Ki@H; l=1/np.linalg.norm(A[:,0]); a1,a2,a3=A[:,0]*l,A[:,1]*l,A[:,2]*l
    if a3[2]<0: a1,a2,a3=-a1,-a2,-a3
    R=np.column_stack([a1,a2,np.cross(a1,a2)]); U,_,Vt=np.linalg.svd(R); R=U@Vt
    return R,a3
def proj(P): p=K@P; return p[:2]/p[2]
def basept(R,t,x,z,beta):
    # hinge at page Y=YH; lid up = -r2; front normal = -r3 (toward the viewer when the screen faces us)
    YH=1150.
    h=R[:,0]*x+R[:,1]*YH+t
    u=np.cos(beta)*(-R[:,1])+np.sin(beta)*(-R[:,2])
    return h+u*z
meas={118.5:{'BL':(680,673),'BR':(1489,673),'FR':(1620,774),'FL':(546,774)},
      125.0:{'FL':(1045,666),'FR':(1080,762),'BR':(1690,773)}}
def resid(p):
    global K,Ki
    beta,D,xl,xr,f=p; K=np.array([[f,0,cx],[0,f,cy],[0,0,1]]); Ki=np.linalg.inv(K); r=[]
    for t,m in meas.items():
        H=S[min(S,key=lambda k:abs(k-t))]; R,tt=pose(H)
        for k,(u,v) in m.items():
            x=xl if k in('BL','FL') else xr; z=0 if k in('BL','BR') else D
            q=proj(basept(R,tt,x,z,beta)); r+= [q[0]-u,q[1]-v]
    return r
sol=least_squares(resid,[np.radians(105),1500,-100,2300,2500],bounds=([0.5,500,-600,1800,800],[3,4000,300,2900,12000]))
print('f',sol.x[4]); resid(sol.x)
print('beta deg',np.degrees(sol.x[0]),'D',sol.x[1],'xl',sol.x[2],'xr',sol.x[3],'res',np.round(sol.fun,1))
for t in [118.5,121.0,122.0,123.0,124.0,125.0,127.6,128.0,128.36]:
    H=S[min(S,key=lambda k:abs(k-t))]; R,tt=pose(H)
    yaw=np.degrees(np.arctan2(R[0,2],R[2,2]))
    cs=[proj(basept(R,tt,x,z,sol.x[0])) for x,z in [(sol.x[2],0),(sol.x[3],0),(sol.x[3],sol.x[1]),(sol.x[2],sol.x[1])]]
    print(t,'yaw %.1f'%yaw,' '.join('(%.0f,%.0f)'%tuple(c) for c in cs))
