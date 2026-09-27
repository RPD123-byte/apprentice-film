# Laptop base in 3D, hinged to the lid (pose from the screen homography). Per-frame params: opening angle a (deg,
# between lid-up and base-forward), base depth D (cm), yaw psi (deg, base rotation about the lid normal-ish vertical),
# lateral shift dx (cm). Layout fractions shared. Fitted by chamfer on Canny edges.
from chamfer import *
from pose import pose_from_H, load_H
import sys
Hs=load_H()
S=30.4/2206; XC=1084*S; YH=1163*S; W=32.4
def lid_frame(t):
    R,tv,_=pose_from_H(Hs[t])
    def s2c(x,y,z=0): return R@np.array([x*S,y*S,z])+tv
    hc=(s2c(-91.5,1163)+s2c(2259,1163))/2
    up=R@np.array([0,-1,0.]); xax=R@np.array([1,0,0.]); nrm=R@np.array([0,0,-1.])
    return hc,up,xax,nrm
def base_frame(t,a,psi=0,dx=0,dy=0):
    hc,up,xax,nrm=lid_frame(t)
    a=np.radians(a); bd=np.cos(a)*up+np.sin(a)*nrm; ny=np.cross(bd,xax)  # ny: base up normal
    p=np.radians(psi)  # yaw about ny
    X=np.cos(p)*xax+np.sin(p)*bd; Z=-np.sin(p)*xax+np.cos(p)*bd
    o=hc+dx*xax+dy*ny
    return o,X,ny,Z
def base_pts(t,prm,L,T=1.5):
    a,D,psi,dx,dy=prm
    kw,kz0,kz1,tw,tz0,tz1=L
    o,X,Y,Z=base_frame(t,a,psi,dx,dy)
    def P3(pts,y=0): return np.array([o+px*X+y*Y+pz*Z for px,pz in pts])
    top=rrect(-W/2,W/2,0,D,1.2,n=30)
    kb=rect(-kw/2,kw/2,kz0*D,kz1*D,n=24); tp=rect(-tw/2,tw/2,tz0*D,tz1*D,n=16)
    bot=rrect(-W/2+0.4,W/2-0.4,0.4,D-0.4,1.0,n=30)
    return {'top':P3(top),'kb':P3(kb),'tp':P3(tp),'bot':P3(bot,-T)}
def pj(P): return np.c_[F*P[:,0]/P[:,2]+CX,F*P[:,1]/P[:,2]+CY]
WT={'top':1.0,'kb':0.6,'tp':0.6,'bot':0.5}
def resid(t,prm,L,dt,T):
    return np.concatenate([WT[k]*sample(dt,pj(P)) for k,P in base_pts(t,prm,L,T).items()])
L0=[28.0,0.05,0.53,14.0,0.57,0.95]
if __name__=='__main__':
    ts=[float(x) for x in sys.argv[1].split(',')]
    prm=np.array([92.0,23.0,0.0,0.0,0.0]); T=1.5
    out={}
    for t in ts:
        dt=edge_dt(t); best=None
        for a0 in [prm[0]-6,prm[0],prm[0]+6]:
            for D0 in [prm[1]*0.85,prm[1],prm[1]*1.15]:
                p0=np.array([a0,D0,prm[2],prm[3],prm[4]])
                sol=least_squares(lambda p: np.r_[resid(t,p,L0,dt,T),0.3*(p[2]),0.3*p[3],0.3*p[4]],p0,loss='soft_l1',f_scale=3.0,x_scale=[1,1,1,0.5,0.5])
                if best is None or sol.cost<best.cost: best=sol
        prm=best.x; out[t]=prm.tolist()
        print(t,'a=%.1f D=%.1f psi=%.1f dx=%.2f dy=%.2f'%tuple(prm),'mean %.2f'%np.mean(resid(t,prm,L0,dt,T)),flush=True)
    json.dump({'L':L0,'T':T,'prm':out},open('fit3d.json','w'))
