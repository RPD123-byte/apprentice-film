# drawing-2's motion as a smooth mesh: KLT points inside the figure at 129.0 tracked frame to frame forward (to 129.32)
# and backward (to 127.84), reseeded inside the warped figure mask; a regularised GX x GY grid warp is fitted per frame
# (adapted from snapshots/s27d-tools/des_mesh3.py). Positions only.
import cv2, numpy as np, json
from scipy.sparse import lil_matrix, vstack as svstack, csr_matrix
from scipy.sparse.linalg import lsqr
from matplotlib.tri import Triangulation, LinearTriInterpolator
from src import frame
TREF=129.0
X0,Y0,X1,Y1=-120,130,1280,970; GX,GY=29,18
xs=np.linspace(X0,X1,GX); ys=np.linspace(Y0,Y1,GY)
nodes=np.array([[x,y] for y in ys for x in xs],np.float64)
C=np.load('../s27-fix2-meas/cls129.npy')
FIG=np.int32([(-10,260),(700,250),(780,150),(1230,150),(1245,540),(1240,720),(1100,760),(870,770),(800,815),(670,830),(560,890),(380,905),(280,810),(-10,860)])
m0=np.zeros((946,2206),np.uint8); cv2.fillPoly(m0,[FIG],255)
m0[(C==0)]=0
m0=cv2.morphologyEx(m0,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
def wts(P):
    fx=np.clip((P[:,0]-X0)/(X1-X0)*(GX-1),0,GX-1-1e-6); fy=np.clip((P[:,1]-Y0)/(Y1-Y0)*(GY-1),0,GY-1-1e-6)
    i=np.floor(fx).astype(int); j=np.floor(fy).astype(int); u=fx-i; v=fy-j
    idx=np.stack([j*GX+i,j*GX+i+1,(j+1)*GX+i,(j+1)*GX+i+1],1); w=np.stack([(1-u)*(1-v),u*(1-v),(1-u)*v,u*v],1)
    return idx,w
rowsL=[]
for j in range(GY):
    for i in range(1,GX-1): rowsL.append([(j*GX+i-1,1),(j*GX+i,-2),(j*GX+i+1,1)])
for i in range(GX):
    for j in range(1,GY-1): rowsL.append([((j-1)*GX+i,1),(j*GX+i,-2),((j+1)*GX+i,1)])
Lm=lil_matrix((len(rowsL),GX*GY))
for r,row in enumerate(rowsL):
    for k,w in row: Lm[r,k]=w
Lm=csr_matrix(Lm)
def solve(refp,cur,lam=2.0,prev=None,mu=0.15):
    idx,w=wts(refp); n=len(refp)
    A=csr_matrix((w.ravel(),(np.repeat(np.arange(n),4),idx.ravel())),shape=(n,GX*GY))
    out=np.zeros_like(nodes)
    for c in range(2):
        blocks=[A,Lm*lam]; b=[cur[:,c],np.zeros(Lm.shape[0])]
        if prev is not None:
            I=csr_matrix((np.full(GX*GY,mu),(np.arange(GX*GY),np.arange(GX*GY))),shape=(GX*GY,GX*GY)); blocks.append(I); b.append(mu*prev[:,c])
        out[:,c]=lsqr(svstack(blocks),np.concatenate(b),atol=1e-9,btol=1e-9,iter_lim=4000)[0]
    return out
def apply(N,P):
    idx,w=wts(P); return (N[idx]*w[...,None]).sum(1)
def inverse(N,Q):
    tri=Triangulation(N[:,0],N[:,1])
    fx=LinearTriInterpolator(tri,nodes[:,0]); fy=LinearTriInterpolator(tri,nodes[:,1])
    rx=fx(Q[:,0],Q[:,1]); ry=fy(Q[:,0],Q[:,1])
    ok=~(np.ma.getmaskarray(rx)|np.ma.getmaskarray(ry))
    return np.c_[np.asarray(rx.filled(0)),np.asarray(ry.filled(0))],ok
def warpmask(N):
    # forward-warp the reference mask through the mesh: map each output pixel back (coarse) via inverse
    ys_,xs_=np.mgrid[0:946:4,0:2206:4]; Q=np.c_[xs_.ravel(),ys_.ravel()].astype(np.float64)
    R,ok=inverse(N,Q); R=np.round(R).astype(int)
    v=np.zeros(len(Q),np.uint8); inb=ok&(R[:,0]>=0)&(R[:,0]<2206)&(R[:,1]>=0)&(R[:,1]<946)
    v[inb]=m0[R[inb,1],R[inb,0]]
    m=cv2.resize(v.reshape(ys_.shape),(2206,946),interpolation=cv2.INTER_NEAREST)
    return cv2.erode(m,np.ones((9,9),np.uint8))
lk=dict(winSize=(25,25),maxLevel=4,criteria=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,40,0.01))
def run(direction,tend):
    ts=[round(TREF+direction*0.04*i,2) for i in range(int(round(abs(tend-TREF)/0.04))+1)]
    g0=frame(TREF,True)
    P=cv2.goodFeaturesToTrack(g0,2500,0.003,8,mask=cv2.erode(m0,np.ones((9,9),np.uint8))).reshape(-1,2).astype(np.float32)
    cur=P.copy(); refp=P.astype(np.float64).copy(); prev=g0; N=nodes.copy(); res={TREF:nodes.copy()}
    for t in ts[1:]:
        g=frame(t,True)
        nxt,st,_=cv2.calcOpticalFlowPyrLK(prev,g,cur.reshape(-1,1,2),None,**lk)
        bck,st2,_=cv2.calcOpticalFlowPyrLK(g,prev,nxt,None,**lk)
        nxt=nxt.reshape(-1,2); fb=np.linalg.norm(bck.reshape(-1,2)-cur,axis=1)
        ok=(st.ravel()==1)&(st2.ravel()==1)&(fb<0.8)&(nxt[:,0]>2)&(nxt[:,0]<2204)&(nxt[:,1]>2)&(nxt[:,1]<944)
        cur=nxt[ok]; refp=refp[ok]
        Nn=solve(refp,cur.astype(np.float64),prev=N)
        e=np.linalg.norm(apply(Nn,refp)-cur,axis=1); keep=e<max(3.0,np.percentile(e,85)*2)
        cur=cur[keep]; refp=refp[keep]; N=solve(refp,cur.astype(np.float64),prev=N)
        res[t]=N.copy(); print(t,len(cur),'res',np.round(np.percentile(e,[50,90]),2))
        if len(cur)<1800:
            m=warpmask(N)
            for x,y in cur: cv2.circle(m,(int(x),int(y)),8,0,-1)
            Q=cv2.goodFeaturesToTrack(g,2500-len(cur),0.003,8,mask=m)
            if Q is not None:
                Q=Q.reshape(-1,2).astype(np.float32); R,okq=inverse(N,Q.astype(np.float64))
                cur=np.vstack([cur,Q[okq]]); refp=np.vstack([refp,R[okq]])
        prev=g
    return res
A=run(1,129.32); B=run(-1,127.84)
A.update(B)
rows=[[t]+list(np.round(A[t].ravel(),1)) for t in sorted(A)]
json.dump({'grid':[X0,Y0,X1,Y1,GX,GY],'rows':rows},open('../s27-fix2-meas/des2mesh_f.json','w'))
