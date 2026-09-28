# The designer's motion as a smooth mesh: KLT points inside his silhouette at 125.0 s, tracked frame to frame forward
# (to 129.28) and backward (to 120.8); each frame, a regularised grid warp (GX x GY nodes over his box) is fitted to
# the tracked displacements (bilinear data term + membrane smoothness). Output: node positions per frame.
import cv2, numpy as np, json, sys
from scipy.sparse import lil_matrix, vstack as svstack, csr_matrix
from scipy.sparse.linalg import lsqr
from src import frame
TREF=125.0
# silhouette at 125.0 (frame px), read off the gridded frame; used only to choose which points to track
SIL=np.float32([(0,252),(70,258),(150,248),(260,238),(360,232),(430,226),(500,212),(560,205),(610,196),(640,150),(700,108),
  (770,86),(860,96),(940,140),(1010,195),(1058,262),(1075,335),(1062,420),(1045,480),(1045,560),(1045,620),(1035,690),(990,725),
  (900,745),(820,770),(760,820),(700,885),(620,915),(450,908),(300,895),(150,900),(0,905)])
X0,Y0,X1,Y1=-300,-60,1400,1100; GX,GY=18,12
xs=np.linspace(X0,X1,GX); ys=np.linspace(Y0,Y1,GY)
nodes=np.array([[x,y] for y in ys for x in xs],np.float64)
def weights(p):
    fx=(p[0]-X0)/(X1-X0)*(GX-1); fy=(p[1]-Y0)/(Y1-Y0)*(GY-1)
    i=int(np.clip(np.floor(fx),0,GX-2)); j=int(np.clip(np.floor(fy),0,GY-2)); u=fx-i; v=fy-j
    return [(j*GX+i,(1-u)*(1-v)),(j*GX+i+1,u*(1-v)),((j+1)*GX+i,(1-u)*v),((j+1)*GX+i+1,u*v)]
# smoothness operator (second differences along x and y)
rowsL=[]
for j in range(GY):
    for i in range(1,GX-1): rowsL.append([(j*GX+i-1,1),(j*GX+i,-2),(j*GX+i+1,1)])
for i in range(GX):
    for j in range(1,GY-1): rowsL.append([((j-1)*GX+i,1),(j*GX+i,-2),((j+1)*GX+i,1)])
Lm=lil_matrix((len(rowsL),GX*GY))
for r,row in enumerate(rowsL):
    for k,w in row: Lm[r,k]=w
Lm=csr_matrix(Lm)
def solve(refp,cur,lam=3.0):
    n=len(refp); A=lil_matrix((n,GX*GY))
    for r,p in enumerate(refp):
        for k,w in weights(p): A[r,k]=w
    A=csr_matrix(A); out=np.zeros_like(nodes)
    d=cur-refp
    for c in range(2):
        M=svstack([A,Lm*lam]); b=np.concatenate([d[:,c],np.zeros(Lm.shape[0])])
        out[:,c]=nodes[:,c]+lsqr(M,b,atol=1e-8,btol=1e-8)[0]
    return out
lk=dict(winSize=(25,25),maxLevel=4,criteria=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,40,0.01))
def run(direction,tend):
    ts=[round(TREF+direction*0.04*i,2) for i in range(int(round(abs(tend-TREF)/0.04))+1)]
    g0=frame(TREF,True); m=np.zeros(g0.shape,np.uint8); cv2.fillPoly(m,[np.int32(SIL)],255); m=cv2.erode(m,np.ones((15,15),np.uint8))
    P=cv2.goodFeaturesToTrack(g0,3000,0.003,7,mask=m).reshape(-1,2).astype(np.float32)
    cur=P.copy(); refp=P.copy(); prev=g0; res={TREF:nodes.copy()}
    for t in ts[1:]:
        g=frame(t,True)
        nxt,st,_=cv2.calcOpticalFlowPyrLK(prev,g,cur.reshape(-1,1,2),None,**lk)
        bck,st2,_=cv2.calcOpticalFlowPyrLK(g,prev,nxt,None,**lk)
        nxt=nxt.reshape(-1,2); fb=np.linalg.norm(bck.reshape(-1,2)-cur,axis=1)
        ok=(st.ravel()==1)&(st2.ravel()==1)&(fb<0.8)&(nxt[:,0]>2)&(nxt[:,0]<2204)&(nxt[:,1]>2)&(nxt[:,1]<944)
        cur=nxt[ok]; refp=refp[ok]
        if len(cur)<15: print('few',t,len(cur)); 
        if len(cur)<6: break
        N=solve(refp,cur)
        # drop points far from the fitted field (outliers: background, occluders)
        pred=np.array([sum(w*N[k] for k,w in weights(p)) for p in refp])
        e=np.linalg.norm(pred-cur,axis=1); keep=e<max(4,np.percentile(e,90)*2)
        if (~keep).sum(): cur=cur[keep]; refp=refp[keep]; N=solve(refp,cur)
        res[t]=N; prev=g
        print(f"{t:.2f} pts={len(cur)} med_err={np.median(e):.2f}",flush=True)
    return res
R=run(-1,120.8); R.update(run(+1,129.28))
json.dump({'grid':[X0,Y0,X1,Y1,GX,GY],'tref':TREF,'frames':[[k]+np.round(R[k],1).flatten().tolist() for k in sorted(R)]},open('../s27d-meas/des_mesh.json','w'))
print('done')
