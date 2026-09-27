# trace.py x0 y0 x1 y1 out.json [thr] : measure the dark fold strokes of the source (t=0) inside a box:
# black-hat line strength -> threshold -> skeleton -> branches; per branch: sampled points, width (px), ink value (0..255)
import cv2, sys, json, numpy as np
from skimage.morphology import skeletonize
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
x0,y0,x1,y1=map(int,sys.argv[1:5]); out=sys.argv[5]; thr=float(sys.argv[6]) if len(sys.argv)>6 else 22
c=cv2.VideoCapture(V); ok,f=c.read()
g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
gb=cv2.GaussianBlur(g,(0,0),0.8)
bh=cv2.morphologyEx(gb,cv2.MORPH_BLACKHAT,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(11,11)))
import os
if os.environ.get('SATO'):
    from skimage.filters import sato
    st=np.zeros_like(g); st[y0-10:y1+10,x0-10:x1+10]=sato(g[y0-10:y1+10,x0-10:x1+10]/255,sigmas=[float(x) for x in os.environ.get('SIG','1.0,1.5,2.2').split(',')],black_ridges=True)
    m=(st>thr).astype(np.uint8); bh=st*255
else:
    m=(bh>thr).astype(np.uint8)
m[:y0,:]=0; m[y1:,:]=0; m[:,:x0]=0; m[:,x1:]=0
if len(sys.argv)>7:
    pm=(cv2.imread(sys.argv[7],0)>0).astype(np.uint8); m&=pm
dt=cv2.distanceTransform(m,cv2.DIST_L2,3)
sk=skeletonize(m>0).astype(np.uint8)
K=np.ones((3,3),np.uint8); nb=cv2.filter2D(sk,-1,K)-1; nb[sk==0]=0
br=sk.copy(); br[nb>2]=0
n,lab=cv2.connectedComponents(br,connectivity=8)
res=[]
for i in range(1,n):
    ys,xs=np.where(lab==i)
    if len(xs)<12: continue
    pts=set(zip(xs.tolist(),ys.tolist()))
    def nbrs(p): return [(p[0]+dx,p[1]+dy) for dx in (-1,0,1) for dy in (-1,0,1) if (dx or dy) and (p[0]+dx,p[1]+dy) in pts]
    ends=[p for p in pts if len(nbrs(p))==1]
    start=ends[0] if ends else next(iter(pts))
    path=[start]; seen={start}
    while True:
        nx=[q for q in nbrs(path[-1]) if q not in seen]
        if not nx: break
        path.append(nx[0]); seen.add(nx[0])
    if len(path)<12: continue
    step=max(1,len(path)//max(2,len(path)//6))
    samp=path[::step]
    if samp[-1]!=path[-1]: samp.append(path[-1])
    w=[round(float(dt[y,x])*2,1) for x,y in samp]
    v=[int(g[y,x]) for x,y in samp]
    s=float(np.mean([bh[y,x] for x,y in path]))
    res.append({'len':len(path),'bh':round(s,1),'p':[[x,y] for x,y in samp],'w':w,'v':v})
res.sort(key=lambda r:-r['len']*r['bh'])
json.dump(res,open(out,'w'))
print(len(res),'strokes; top:',[(r['len'],r['bh']) for r in res[:10]])
