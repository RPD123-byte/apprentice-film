# Fit an orbit camera to KLT tracks: final camera fixed; camera k = orbit by theta_k about a vertical axis through
# the pivot P=(0,py,1) (+ optional per-frame yaw offset phi_k). Per-track inverse depth along its first ray.
import json,numpy as np
from scipy.optimize import least_squares
from scipy.sparse import lil_matrix
D=json.load(open('snapshots/s28-tools/klt.json')); n0=D['n0']
tracks=D['tracks']
cx,cy=1103.0,473.0
nF=int(round(131.36*25))-n0   # final frame index (camera frozen from here)
rng=np.random.default_rng(1)
# subsample tracks spatially
sel=[]
grid={}
for i,t in enumerate(tracks):
    k,x,y=t[0]; key=(int(x//60),int(y//60),k//4)
    grid.setdefault(key,[]).append(i)
for key,ids in grid.items():
    ids=sorted(ids,key=lambda i:-len(tracks[i]))
    sel+=ids[:2]
T=[tracks[i] for i in sel]
print('tracks',len(T))
NK=max(o[0] for t in T for o in t)+1
def frame_idx(k): return min(k,nF)
def Ry(a):
    c,s=np.cos(a),np.sin(a); return np.array([[c,0,s],[0,1,0],[-s,0,c]])
USE_PHI='phi' in __import__('sys').argv
USE_PIT='pitch' in __import__('sys').argv
def unpack(p):
    f=p[0]; py=p[1]; th=np.zeros(NK); th[:nF]=p[2:2+nF]
    o=2+nF
    phi=np.zeros(NK)
    if USE_PHI: phi[:nF]=p[o:o+nF]; o+=nF
    pit=np.zeros(NK)
    if USE_PIT: pit[:nF]=p[o:o+nF]; o+=nF
    rho=p[o:]
    global PIT; PIT=pit
    return f,py,th,phi,rho
def cam(k,f,py,th,phi):
    P=np.array([0,py,1.0])
    C=P+Ry(th[k])@(np.zeros(3)-P)
    R=Ry(-(th[k]+phi[k]))
    a=PIT[k]; ca,sa=np.cos(a),np.sin(a)
    Rx=np.array([[1,0,0],[0,ca,-sa],[0,sa,ca]])
    return C,Rx@R
obs=[]  # (track j, first frame s, frame k, u, v, u0, v0)
for j,t in enumerate(T):
    s,u0,v0=t[0]
    for (k,u,v) in t[1:]:
        obs.append((j,s,k,u,v,u0,v0))
obs=np.array(obs)
def resid(p):
    f,py,th,phi,rho=unpack(p)
    out=np.empty(2*len(obs))
    cams=[cam(k,f,py,th,phi) for k in range(NK)]
    J=obs[:,0].astype(int); S=obs[:,1].astype(int); K=obs[:,2].astype(int)
    ray=np.stack([(obs[:,5]-cx)/f,(obs[:,6]-cy)/f,np.ones(len(obs))],1)
    Cs=np.array([cams[s][0] for s in range(NK)]); Rs=np.array([cams[s][1] for s in range(NK)])
    X=Cs[S]+np.einsum('nji,nj->ni',Rs[S],ray/rho[J][:,None])
    Xc=np.einsum('nij,nj->ni',Rs[K],X-Cs[K])
    u=f*Xc[:,0]/Xc[:,2]+cx; v=f*Xc[:,1]/Xc[:,2]+cy
    out[0::2]=u-obs[:,3]; out[1::2]=v-obs[:,4]
    return out
nt=len(T)
bg=[39]*int(round((130.5-129.2)*25))
import math
# background flow per frame (px) from DIS medians, frames n0+1..nF
flow=[]
for k in range(1,NK):
    t=(n0+k)/25
    if t<=130.5: v=38
    elif t<=131.36: v=38*max(0,(131.36-t)/(131.36-130.5))**1.2
    else: v=0
    if abs(t-129.56)<0.01 or abs(t-130.56)<0.01: v=0
    flow.append(v)
SIGN=float(__import__('os').environ.get('SIGN','1'))
th0=[]
for k in range(nF):
    th0.append(SIGN*sum(flow[k:nF])/(0.8*2000))
p0=[2000.0,0.0]+th0+([0.0]*nF if USE_PHI else [])+([0.0]*nF if USE_PIT else [])+[0.5]*nt
# sparsity
m=2*len(obs); npar=len(p0)
A=lil_matrix((m,npar),dtype=int)
o_phi=2+nF; o_pit=2+nF+(nF if USE_PHI else 0)
o_rho=o_pit+(nF if USE_PIT else 0)
for i,(j,s,k,*_) in enumerate(obs):
    j,s,k=int(j),int(s),int(k)
    for r in (2*i,2*i+1):
        A[r,0]=1; A[r,1]=1
        for q in (s,k):
            if q<nF:
                A[r,2+q]=1
                if USE_PHI: A[r,o_phi+q]=1
                if USE_PIT: A[r,o_pit+q]=1
        A[r,o_rho+j]=1
lb=[500,-2]+[-3]*nF+([-1]*nF if USE_PHI else [])+([-0.3]*nF if USE_PIT else [])+[0.02]*nt
ub=[8000,2]+[3]*nF+([1]*nF if USE_PHI else [])+([0.3]*nF if USE_PIT else [])+[20]*nt
res=least_squares(resid,p0,jac_sparsity=A,loss='soft_l1',f_scale=3.0,bounds=(lb,ub),verbose=1,max_nfev=int(__import__('os').environ.get('NFEV','60')),x_scale='jac')
f,py,th,phi,rho=unpack(res.x)
r=resid(res.x).reshape(-1,2); e=np.linalg.norm(r,axis=1)
print('f',f,'py',py,'median err',np.median(e),'p90',np.percentile(e,90))
for k in range(NK): print(f"{(n0+k)/25:.2f} th={np.degrees(th[k]):7.2f} phi={np.degrees(phi[k]):6.2f} pit={np.degrees(PIT[k]):6.2f}")
# depth distribution by image region at final-ish frames
json.dump(dict(f=f,py=py,th=th.tolist(),phi=phi.tolist(),n0=n0,nF=nF),open('snapshots/s28-tools/cam_fit%s.json'%('_phi' if USE_PHI else ''),'w'))
# inverse depths vs position
Z=1/rho
for j,t in enumerate(T[:0]): pass
import collections
bins=collections.defaultdict(list)
for j,t in enumerate(T):
    s,u,v=t[0]
    if e[obs[:,0]==j].size and np.median(e[obs[:,0]==j])<3:
        bins[(int(v//200),int(u//400))].append(Z[j])
for key in sorted(bins): print(key, len(bins[key]), np.round(np.median(bins[key]),2))
# dump 3D points in final-camera coords
cams=[cam(k,f,py,th,phi) for k in range(NK)]
pts=[]
for j,t in enumerate(T):
    s,u0,v0=t[0]
    C,R=cams[s]
    ray=np.array([(u0-cx)/f,(v0-cy)/f,1.0])
    X=C+R.T@(ray/rho[j])
    ej=e[obs[:,0]==j]
    pts.append(dict(X=X.tolist(),s=s,u=u0,v=v0,err=float(np.median(ej)) if ej.size else 99,len=len(t)))
json.dump(dict(f=f,py=py,th=th.tolist(),phi=phi.tolist(),pit=PIT.tolist(),n0=n0,nF=nF,pts=pts),open('snapshots/s28-tools/sfm%s.json'%('_'.join(['']+[a for a in __import__('sys').argv[1:]])),'w'))
