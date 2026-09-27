import numpy as np,cv2,json
A=np.load('Amap.npy'); lay=np.load('lay.npy'); ok=np.load('ok.npy')
D=json.load(open('data.json')); layers=D['CLOUDS_BACK']+D['CLOUDS_FRONT']
H,W=lay.shape; yy,xx=np.mgrid[0:H,0:W]
w=ok.astype(np.float32); Ab=cv2.GaussianBlur(np.where(ok,A,0).astype(np.float32),(0,0),6)/(cv2.GaussianBlur(w,(0,0),6)+1e-6)
# per-layer distance from the layer's own outline (union of circles at r-2.5)
dist=np.zeros((H,W),np.float32)
for i,L in enumerate(layers):
    m=np.zeros((H+400,W+400),np.uint8)
    for x,y,r in L: cv2.circle(m,(int(round(x))+200,int(round(y))+200),int(round(r-2.5)),255,-1)
    dt=cv2.distanceTransform(m,cv2.DIST_L2,5)[200:-200,200:-200]
    dist[lay==i]=dt[lay==i]
np.save('dist.npy',dist)
sub=ok.copy(); sub[::,1::3]=False; sub[1::3,:]=False
idx=np.nonzero(sub); a=Ab[idx]; X=xx[idx].astype(np.float32); Y=yy[idx].astype(np.float32); Li=lay[idx]; Dd=dist[idx]
cols=[];names=[]
for i in range(9):
    cols.append((Li==i).astype(np.float32)); names.append(('base',i))
    cols.append(((Li==i)*np.exp(-Dd/22)).astype(np.float32)); names.append(('rim',i))
M=np.stack(cols,1)
blobs=[]
cand=[(cx,cy,s) for s in [30,55,90,150] for cx in range(-100,2306,int(s*0.6)) for cy in range(500,1100,int(s*0.6))]
cand=[c for c in cand if (c[1]>560)]
def solve(M):
    c,*_=np.linalg.lstsq(M,a,rcond=None); return c, a-M@c
c,r=solve(M); print('base+rim resid',r.std())
G=None
for it in range(40):
    best=None
    # score each candidate by correlation with residual
    for (cx,cy,s) in cand:
        g=np.exp(-((X-cx)**2+(Y-cy)**2)/(2*s*s))
        nn=g@g
        if nn<50: continue
        sc=(g@r)**2/nn
        if best is None or sc>best[0]: best=(sc,cx,cy,s,g)
    _,cx,cy,s,g=best; blobs.append((cx,cy,s)); M=np.c_[M,g]
    c,r=solve(M)
    if it%5==4: print(it+1,'blobs resid',round(float(r.std()),4))
coef=c
out={'names':[list(n) for n in names],'coef':[float(v) for v in coef[:18]],'blobs':[[b[0],b[1],b[2],float(coef[18+k])] for k,b in enumerate(blobs)]}
json.dump(out,open('cloudfit3.json','w'),indent=0)
print(json.dumps(out)[:3000])
