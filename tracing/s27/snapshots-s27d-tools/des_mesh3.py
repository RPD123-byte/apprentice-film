# The designer's motion as a smooth mesh (v3): KLT points inside his (warped) silhouette, tracked frame to frame from
# the 125.0 hold forward (to 129.32) and backward (to 120.72), RE-SEEDED every frame inside the current silhouette with
# their reference coordinates back-projected through the current mesh (so the point set never thins out). Each frame a
# regularised GX x GY grid warp is fitted (bilinear data term + second-difference smoothness). Positions only.
import cv2, numpy as np, json, sys
from scipy.sparse import lil_matrix, vstack as svstack, csr_matrix
from scipy.sparse.linalg import lsqr
from matplotlib.tri import Triangulation, LinearTriInterpolator
from src import frame
TREF=125.0
SIL=np.float32([(0,252),(70,258),(150,248),(260,238),(360,232),(430,226),(500,212),(560,205),(610,196),(640,150),(700,108),
  (770,86),(860,96),(940,140),(1010,195),(1058,262),(1075,335),(1062,420),(1045,480),(1045,560),(1045,620),(1035,690),(990,725),
  (900,745),(820,770),(760,820),(700,885),(620,915),(450,908),(300,895),(150,900),(0,905),(-200,905),(-200,252)])
X0,Y0,X1,Y1=-200,-20,1300,1060; GX,GY=16,12
xs=np.linspace(X0,X1,GX); ys=np.linspace(Y0,Y1,GY)
nodes=np.array([[x,y] for y in ys for x in xs],np.float64)
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
        if prev is not None:   # weak temporal prior toward the previous frame's nodes (keeps unobserved nodes still)
            I=csr_matrix((np.full(GX*GY,mu),(np.arange(GX*GY),np.arange(GX*GY))),shape=(GX*GY,GX*GY)); blocks.append(I); b.append(mu*prev[:,c])
        out[:,c]=lsqr(svstack(blocks),np.concatenate(b),atol=1e-9,btol=1e-9,iter_lim=4000)[0]
    return out
def apply(N,P):
    idx,w=wts(P); return (N[idx]*w[...,None]).sum(1)
TRI=None
def inverse(N,Q):
    # frame -> ref through the current mesh: linear interpolation of ref node coords on the deformed node positions
    tri=Triangulation(N[:,0],N[:,1])
    fx=LinearTriInterpolator(tri,nodes[:,0]); fy=LinearTriInterpolator(tri,nodes[:,1])
    rx=fx(Q[:,0],Q[:,1]); ry=fy(Q[:,0],Q[:,1])
    ok=~(np.ma.getmaskarray(rx)|np.ma.getmaskarray(ry))
    return np.c_[np.asarray(rx.filled(0)),np.asarray(ry.filled(0))],ok
lk=dict(winSize=(25,25),maxLevel=4,criteria=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,40,0.01))
def silmask(N):
    P=apply(N,SIL.astype(np.float64)); m=np.zeros((946,2206),np.uint8); cv2.fillPoly(m,[np.int32(np.round(P))],255)
    return cv2.erode(m,np.ones((13,13),np.uint8))
def run(direction,tend):
    ts=[round(TREF+direction*0.04*i,2) for i in range(int(round(abs(tend-TREF)/0.04))+1)]
    g0=frame(TREF,True); m=silmask(nodes)
    P=cv2.goodFeaturesToTrack(g0,2500,0.003,8,mask=m).reshape(-1,2).astype(np.float32)
    cur=P.copy(); refp=P.astype(np.float64).copy(); prev=g0; N=nodes.copy(); res={TREF:nodes.copy()}
    for t in ts[1:]:
        g=frame(t,True)
        nxt,st,_=cv2.calcOpticalFlowPyrLK(prev,g,cur.reshape(-1,1,2),None,**lk)
        bck,st2,_=cv2.calcOpticalFlowPyrLK(g,prev,nxt,None,**lk)
        nxt=nxt.reshape(-1,2); fb=np.linalg.norm(bck.reshape(-1,2)-cur,axis=1)
        ok=(st.ravel()==1)&(st2.ravel()==1)&(fb<0.8)&(nxt[:,0]>2)&(nxt[:,0]<2204)&(nxt[:,1]>2)&(nxt[:,1]<944)
        cur=nxt[ok]; refp=refp[ok]
        if len(cur)<10: print('lost',t); break
        Nn=solve(refp,cur.astype(np.float64),prev=N)
        e=np.linalg.norm(apply(Nn,refp)-cur,axis=1); keep=e<max(3.0,np.percentile(e,85)*2)
        cur=cur[keep]; refp=refp[keep]; N=solve(refp,cur.astype(np.float64),prev=N)
        res[t]=N.copy()
        # reseed inside the warped silhouette
        if len(cur)<1800:
            m=silmask(N)
            for x,y in cur: cv2.circle(m,(int(x),int(y)),8,0,-1)
            Q=cv2.goodFeaturesToTrack(g,2500-len(cur),0.003,8,mask=m)
            if Q is not None:
                Q=Q.reshape(-1,2).astype(np.float32); R,okq=inverse(N,Q.astype(np.float64))
                cur=np.vstack([cur,Q[okq]]); refp=np.vstack([refp,R[okq]])
        prev=g
        print(f"{t:.2f} pts={len(cur)} med_err={np.median(e):.2f}",flush=True)
    return res
R=run(-1,120.72); R.update(run(+1,129.32))
json.dump({'grid':[X0,Y0,X1,Y1,GX,GY],'tref':TREF,'frames':[[k]+np.round(R[k],1).flatten().tolist() for k in sorted(R)]},open('../s27d-meas/des_mesh3.json','w'))
print('done')
