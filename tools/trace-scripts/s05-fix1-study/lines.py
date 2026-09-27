# lines.py img x0 y0 x1 y1 thr minlen out.jpg [mask-poly-json]: skeletonise dark ink lines inside a region and print
# them as simplified polylines (a tracing aid: coordinates only)
import cv2, numpy as np, sys, json
from skimage.morphology import skeletonize
im=cv2.cvtColor(cv2.imread(sys.argv[1]),cv2.COLOR_BGR2GRAY).astype(np.float32)
x0,y0,x1,y1,thr,minlen=map(int,sys.argv[2:8]); out=sys.argv[8]
sub=im[y0:y1,x0:x1]
bg=cv2.GaussianBlur(sub,(0,0),6)
ink=((bg-sub)>thr)&(sub<150)       # darker than the local surround
if len(sys.argv)>9:
    poly=np.array(json.loads(sys.argv[9]),np.int32)-[x0,y0]; m=np.zeros_like(sub,np.uint8); cv2.fillPoly(m,[poly],1); ink&=m.astype(bool)
sk=skeletonize(ink)
# trace skeleton into polylines
H,W=sk.shape; seen=np.zeros_like(sk,bool); lines=[]
nb=[(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
def neigh(y,x): return [(y+dy,x+dx) for dy,dx in nb if 0<=y+dy<H and 0<=x+dx<W and sk[y+dy,x+dx]]
ends=[(y,x) for y,x in zip(*np.nonzero(sk)) if len(neigh(y,x))==1]
for s in ends+list(zip(*np.nonzero(sk))):
    if seen[s]: continue
    path=[s]; seen[s]=True; cur=s
    while True:
        nx=[p for p in neigh(*cur) if not seen[p]]
        if not nx: break
        cur=nx[0]; seen[cur]=True; path.append(cur)
    if len(path)>=minlen: lines.append(path)
vis=cv2.cvtColor(sub.astype(np.uint8),cv2.COLOR_GRAY2BGR)
for i,p in enumerate(sorted(lines,key=len,reverse=True)):
    a=np.array([[x,y] for y,x in p],np.int32)
    ap=cv2.approxPolyDP(a.reshape(-1,1,2),1.5,False)[:,0,:]
    print(f'L{i} n={len(p)}:', json.dumps([[int(x+x0),int(y+y0)] for x,y in ap]))
    cv2.polylines(vis,[ap.reshape(-1,1,2)],False,(0,0,255),1)
    cv2.putText(vis,str(i),tuple(int(v) for v in ap[0]),0,0.3,(0,255,255),1)
cv2.imwrite(out,cv2.resize(vis,None,fx=2,fy=2,interpolation=cv2.INTER_NEAREST))
