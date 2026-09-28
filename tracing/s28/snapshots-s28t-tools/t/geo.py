# s28 camera + scene geometry (from the SfM fit, phi+pitch model). World = final camera frame (x right, y down, z fwd).
import json,numpy as np
D=json.load(open('snapshots/s28t-tools/t/sfm_phi_pitch.json'))
F=D['f']; CX,CY=1103.0,473.0; N0=D['n0']
TH=np.array(D['th']); PHI=np.array(D['phi']); PIT=np.array(D['pit'])
PIV=np.array([0,0,1.0])
def Ry(a):
    c,s=np.cos(a),np.sin(a); return np.array([[c,0,s],[0,1,0],[-s,0,c]])
def Rx(a):
    c,s=np.cos(a),np.sin(a); return np.array([[1,0,0],[0,c,-s],[0,s,c]])
def params(t):
    k=int(round(t*25))-N0; k=max(0,min(len(TH)-1,k))
    return TH[k],PHI[k],PIT[k]
def cam_from(th,phi,pit):
    C=PIV+Ry(th)@(-PIV); R=Rx(pit)@Ry(-(th+phi)); return C,R
def cam(t): return cam_from(*params(t))
def project(t,X):
    C,R=cam(t); X=np.atleast_2d(X); Xc=(R@(X-C).T).T
    return np.stack([F*Xc[:,0]/Xc[:,2]+CX,F*Xc[:,1]/Xc[:,2]+CY],1)
def ray(t,uv):
    C,R=cam(t); uv=np.atleast_2d(uv)
    d=np.stack([(uv[:,0]-CX)/F,(uv[:,1]-CY)/F,np.ones(len(uv))],1)
    return C,(R.T@d.T).T
# planes: n.X = d
def vplane(p0,dirxz):   # vertical plane through p0=(x,z) with horizontal direction dirxz
    n=np.array([-dirxz[1],0,dirxz[0]]); n/=np.linalg.norm(n); return n,float(n@np.array([p0[0],0,p0[1]]))
BACK=vplane((-0.515,1.83),(-0.802,-0.598))
RIGHT=vplane((0.663,1.769),(-0.202,0.979))
DESK=(np.array([-0.0036,1.0,-0.1086])/np.linalg.norm([-0.0036,1.0,-0.1086]),0.025/np.linalg.norm([-0.0036,1.0,-0.1086]))
def hit(t,uv,plane):
    C,d=ray(t,uv); n,dd=plane
    s=(dd-C@n)/(d@n); return C+d*s[:,None]
def transfer(t0,t1,uv,plane):   # screen point at t0 on plane -> screen at t1
    return project(t1,hit(t0,uv,plane))
