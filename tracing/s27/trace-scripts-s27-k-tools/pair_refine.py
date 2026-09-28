# pair_refine.py chain.json out.json t0 t1 t2 ... : key-to-key mesh refinement (measurement only). M(t0) = chain mesh; for
# each next key, start from M(prev) moved by the chain's own motion, then align the previous key's source frame (masked by
# its GrabCut silhouette) to this key's frame through the mesh by DIS flow, 4 rounds (robust affine + damped residual, no
# folds). Writes {key: mesh} plus the chain for the in-between frames.
import cv2, numpy as np, json, sys
from scipy.interpolate import griddata
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
from common import load
C=json.load(open(sys.argv[1])); OUT=sys.argv[2]; K=[float(v) for v in sys.argv[3:]]
G=np.array(C['grid'],float); CH=C['frames']; GX,GY=12,9
H,W=946,2206
yy,xx=np.mgrid[0:H,0:W]; PIX=np.stack([xx.ravel(),yy.ravel()],1).astype(np.float32)
dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM); dis.setFinestScale(1); dis.setPatchSize(12); dis.setPatchStride(4)
nb=[[k2 for k2 in range(len(G)) if abs(k2%GX-k%GX)+abs(k2//GX-k//GX)==1] for k in range(len(G))]
def pad(Pa,Pb):
    c=Pa.mean(0); ex_a=[];ex_b=[]
    for k in range(len(Pa)):
        i,j=k%GX,k//GX
        if i in (0,GX-1) or j in (0,GY-1):
            d=Pa[k]-c; d=d/np.linalg.norm(d)*1500; ex_a.append(Pa[k]+d); ex_b.append(Pb[k]+d)
    return np.concatenate([Pa,ex_a]),np.concatenate([Pb,ex_b])
def warp(img,mask,Pa,Pb):
    A,B=pad(Pa,Pb)
    q=griddata(B,A,PIX,method='linear'); q=np.nan_to_num(q,nan=-1e4).astype(np.float32)
    mx=q[:,0].reshape(H,W); my=q[:,1].reshape(H,W)
    return cv2.remap(img,mx,my,cv2.INTER_LINEAR), cv2.remap(mask,mx,my,cv2.INTER_NEAREST)>0
def areas(Q):
    a=[]
    for j in range(GY-1):
        for i in range(GX-1):
            k=j*GX+i; q=[Q[k],Q[k+1],Q[k+GX+1],Q[k+GX]]
            a.append(0.5*sum(q[n][0]*q[(n+1)%4][1]-q[(n+1)%4][0]*q[n][1] for n in range(4)))
    return np.array(a)
a0=areas(G)
M={K[0]:np.array(CH[str(K[0])],float)}
gray=lambda t: cv2.GaussianBlur(cv2.cvtColor(load(t),cv2.COLOR_BGR2GRAY),(0,0),1.0)
for ta,tb in zip(K[:-1],K[1:]):
    Pa=M[ta]; Ca=np.array(CH[str(ta)]); Cb=np.array(CH[str(tb)])
    # start: M(ta) moved by the chain's motion ta->tb (piecewise-linear)
    Pb=griddata(Ca,Cb,Pa,method='linear'); nn=griddata(Ca,Cb,Pa,method='nearest'); Pb=np.where(np.isnan(Pb),nn+(Pa-Ca),Pb)
    Ia=gray(ta); Ib=gray(tb)
    ma=(cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s27-k-mask/dk-{ta}.png')[...,0]>128).astype(np.uint8)*255
    mb=cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s27-k-mask/dk-{tb}.png')[...,0]>128
    for it in range(5):
        w,m=warp(Ia,ma,Pa,Pb); m&=mb
        e=np.abs(w.astype(np.float32)-Ib.astype(np.float32))[m].mean()
        if it==4: break
        r=dis.calc(w,Ib,None)
        dP=np.zeros_like(Pb); ok=np.zeros(len(Pb),bool)
        for k,(x,y) in enumerate(Pb):
            x0,x1=int(max(0,x-55)),int(min(W,x+56)); y0,y1=int(max(0,y-55)),int(min(H,y+56))
            if x1<=x0 or y1<=y0: continue
            mk=m[y0:y1,x0:x1]
            if mk.mean()<0.3: continue
            dP[k]=np.median(r[y0:y1,x0:x1][mk],0); ok[k]=True
        A,_=cv2.estimateAffine2D(np.float32(Pb[ok]),np.float32(Pb[ok]+dP[ok]),ransacReprojThreshold=5)
        Pq=(Pb@A[:,:2].T)+A[:,2]; R=np.where(ok[:,None],Pb+dP-Pq,0)
        R2=R.copy()
        for k in range(len(Pb)): R2[k]=0.6*R[k]+0.4*np.mean(R[nb[k]],0)
        R=np.where(ok[:,None],R2,0.5*R2); f=1.0
        while f>0.05 and (areas(Pq+f*R)/a0).min()<0.35: f*=0.7
        Pb=Pq+f*R
        print(ta,tb,'it',it,'resid',round(float(e),1),flush=True)
    print(ta,tb,'final resid',round(float(e),1),flush=True)
    M[tb]=Pb
# in-between frames: the chain, corrected linearly so it passes through the refined key meshes
out={}
for ta,tb in zip(K[:-1],K[1:]):
    Da=M[ta]-np.array(CH[str(ta)]); Db=M[tb]-np.array(CH[str(tb)])
    n=int(round((tb-ta)/0.04))
    for s in range(n+1):
        t=round(ta+s*0.04,2); u=s/n
        out[str(t)]=(np.array(CH[str(t)])+(1-u)*Da+u*Db).round(1).tolist()
json.dump({'grid':G.tolist(),'frames':out,'keys':{str(k):v.round(1).tolist() for k,v in M.items()}},open(OUT,'w'))
