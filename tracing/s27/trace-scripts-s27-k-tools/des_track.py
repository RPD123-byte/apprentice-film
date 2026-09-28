# Track the designer's 12x9 control mesh on the source by template alignment (measurement only):
# template = source frame @125.0 inside his silhouette; for each frame the template is warped by the current mesh
# (piecewise-linear), DIS flow warped->source gives the residual, and each mesh point moves by the robust (median)
# residual of the silhouette pixels around it; a light smoothing keeps the mesh regular. Chained frame to frame.
# usage: des_track.py T0 T1 out.json [init.json]   (T0's mesh from s27/data.js DES unless init given)
import cv2, numpy as np, json, sys, subprocess, os
from scipy.interpolate import griddata
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
from common import load
T0=float(sys.argv[1]); T1=float(sys.argv[2]); OUT=sys.argv[3]
GX,GY=12,9
G=np.array([[x,y] for y in range(40,921,110) for x in range(-100,1111,110)],float)
if len(sys.argv)>4: P0=np.array(json.load(open(sys.argv[4]))['P'],float)
else:
    js=subprocess.run(['node','-e',"import('/Users/computer/rootline/apprentice-film/src/shots/s27/data.js').then(m=>console.log(JSON.stringify(m.DES)))"],capture_output=True,text=True).stdout
    D=np.array(json.loads(js)); i=np.argmin(abs(D[:,0]-T0)); P0=D[i,1:].reshape(-1,2)
sil=np.array(json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s27-meas/sil125.json')),float)
tmpl=cv2.cvtColor(load(125.0),cv2.COLOR_BGR2GRAY)
H,W=tmpl.shape
tm=np.zeros((H,W),np.uint8); cv2.fillPoly(tm,[np.int32(np.round(sil))],1)
tm=cv2.erode(tm,np.ones((5,5),np.uint8))
yy,xx=np.mgrid[0:H,0:W]; PIX=np.stack([xx.ravel(),yy.ravel()],1).astype(np.float32)
# pad the mesh with a far ring so griddata covers the frame (the ring moves with the nearest border point)
def padded(P):
    Gp=[G]; Pp=[P]
    c=G.mean(0)
    for k in range(len(G)):
        i,j=k%GX,k//GX
        if i in (0,GX-1) or j in (0,GY-1):
            d=G[k]-c; d=d/np.linalg.norm(d)*1500
            Gp.append((G[k]+d)[None]); Pp.append((P[k]+d)[None])
    return np.concatenate(Gp),np.concatenate(Pp)
def warp_tmpl(P):
    Gp,Pp=padded(P)
    q=griddata(Pp,Gp,PIX,method='linear')
    q=np.nan_to_num(q,nan=-1e4).astype(np.float32)
    mx=q[:,0].reshape(H,W); my=q[:,1].reshape(H,W)
    w=cv2.remap(tmpl,mx,my,cv2.INTER_LINEAR,borderValue=0)
    m=cv2.remap(tm*255,mx,my,cv2.INTER_NEAREST,borderValue=0)>0
    return w,m
dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
dis.setFinestScale(1); dis.setPatchSize(12); dis.setPatchStride(4)
nb=[[k2 for k2 in range(len(G)) if abs(k2%GX-k%GX)+abs(k2//GX-k//GX)==1] for k in range(len(G))]
P=P0.copy(); out={}
n=int(round(abs(T1-T0)/0.04)); step=0.04 if T1>T0 else -0.04
prevF=None
for s_ in range(n+1):
    t=round(T0+s_*step,2); F=cv2.cvtColor(load(t),cv2.COLOR_BGR2GRAY)
    def support(P):
        ok=np.zeros(len(P),bool)
        w,m=warp_tmpl(P)
        for k,(x,y) in enumerate(P):
            x0,x1=int(max(0,x-55)),int(min(W,x+56)); y0,y1=int(max(0,y-55)),int(min(H,y+56))
            if x1>x0 and y1>y0 and m[y0:y1,x0:x1].mean()>0.5: ok[k]=True
        return ok
    def regular(P,dP,ok,damp):
        # affine fit of the supported updates (robust), damped non-rigid residual on supported points only
        A,inl=cv2.estimateAffine2D(np.float32(P[ok]),np.float32(P[ok]+dP[ok]),ransacReprojThreshold=6)
        if A is None: return P+np.where(ok[:,None],dP,0)
        Pa=(P@A[:,:2].T)+A[:,2]
        R=np.where(ok[:,None],P+dP-Pa,0)
        for _ in range(2):
            R2=R.copy()
            for k in range(len(P)): R2[k]=0.5*R[k]+0.5*np.mean(R[nb[k]],0)
            R=np.where(ok[:,None],R2,R2*0.5)
        Pn=Pa+damp*R
        # no folds: every cell keeps at least 40% of its template area and its orientation
        def areas(Q):
            a=[]
            for j in range(GY-1):
                for i in range(GX-1):
                    k=j*GX+i; q=[Q[k],Q[k+1],Q[k+GX+1],Q[k+GX]]
                    a.append(0.5*sum(q[n][0]*q[(n+1)%4][1]-q[(n+1)%4][0]*q[n][1] for n in range(4)))
            return np.array(a)
        a0=areas(G); f=1.0
        while f>0.05 and (areas(Pa+f*damp*R)/a0).min()<0.4: f*=0.7
        return Pa+f*damp*R
    if prevF is not None:   # predict with the frame-to-frame source flow (supported points), affine for the rest
        fl=dis.calc(prevF,F,None); dP=np.zeros_like(P); ok=support(P)
        for k,(x,y) in enumerate(P):
            xi,yi=int(round(x)),int(round(y))
            if ok[k] and 6<=xi<W-6 and 6<=yi<H-6: dP[k]=np.median(fl[yi-6:yi+7,xi-6:xi+7].reshape(-1,2),0)
            else: ok[k]=False
        if ok.sum()>=6: P=regular(P,dP,ok,0.7)
    for it in range(int(os.environ.get("ITERS","3"))):
        w,m=warp_tmpl(P)
        r=dis.calc(w,F,None)
        dP=np.zeros_like(P); ok=np.zeros(len(P),bool)
        for k,(x,y) in enumerate(P):
            x0,x1=int(max(0,x-55)),int(min(W,x+56)); y0,y1=int(max(0,y-55)),int(min(H,y+56))
            if x1<=x0 or y1<=y0: continue
            mk=m[y0:y1,x0:x1]
            if mk.mean()<0.5: continue
            v=r[y0:y1,x0:x1][mk]; dP[k]=np.median(v,0); ok[k]=True
        if ok.sum()>=6: P=regular(P,dP,ok,0.8)
    # residual check
    w,m=warp_tmpl(P); e=np.abs(w.astype(np.float32)-F.astype(np.float32))[m].mean()
    out[str(t)]=P.round(1).tolist(); prevF=F
    print(t,'resid',round(float(e),1),flush=True)
json.dump({'grid':G.tolist(),'frames':out},open(OUT,'w'))
