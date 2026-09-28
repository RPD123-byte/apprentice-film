#!/usr/bin/env python3
# inkline.py REF x0 y0 x1 y1 OUT [--dark|--light] [--thr=T] [--eps=E] [--min=L] [--sig=S]
# Centre-lines of the ink lines in a crop of the ungraded reference (black-hat / white-top-hat ridge, threshold,
# skeleton), split at junctions, each simplified by RDP (eps px) -> OUT.json {id: [[x,y],...]} + OUT.jpg overlay with ids.
# Used to MEASURE contour control points (a handful per contour); nothing here is loaded by the film.
import sys, json, numpy as np, cv2
from skimage.morphology import skeletonize
a=sys.argv; ref=a[1]; x0,y0,x1,y1=[int(v) for v in a[2:6]]; out=a[6]
opt=lambda k,d: float([s for s in a if s.startswith(f'--{k}=')][0].split('=')[1]) if any(s.startswith(f'--{k}=') for s in a) else d
thr=opt('thr',0.12); eps=opt('eps',1.5); mn=opt('min',25); sig=opt('sig',1.0); rad=int(opt('rad',4))
u=np.load(f'{ref}_u.npy').mean(2)[y0:y1,x0:x1].astype(np.float32)
u=cv2.GaussianBlur(u,(0,0),sig)
k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*rad+1,2*rad+1))
if '--light' in a: r=u-cv2.morphologyEx(u,cv2.MORPH_OPEN,k)
else: r=cv2.morphologyEx(u,cv2.MORPH_CLOSE,k)-u
m=r>thr
sk=skeletonize(m)
# junction / endpoint split
ys,xs=np.nonzero(sk); S=set(zip(ys,xs))
def nb(p):
    y,x=p; return [(y+dy,x+dx) for dy in (-1,0,1) for dx in (-1,0,1) if (dy or dx) and (y+dy,x+dx) in S]
deg={p:len(nb(p)) for p in S}
junc={p for p,d in deg.items() if d>2}
seen=set(); paths=[]
for p in S:
    if p in seen or p in junc: continue
    if deg[p]==1 or True:
        # grow both ways from p through degree-2 pixels
        path=[p]; seen.add(p)
        for dirn in range(2):
            cur=p
            while True:
                nx=[q for q in nb(cur) if q not in seen and q not in junc]
                if not nx: break
                cur=nx[0]; seen.add(cur); path.append(cur) if dirn==0 else path.insert(0,cur)
        if len(path)>=mn: paths.append(path)
res={}; img=cv2.cvtColor((np.clip(u,0,1)*255).astype(np.uint8),cv2.COLOR_GRAY2BGR)
sc=max(1,int(round(900/max(x1-x0,y1-y0))))
img=cv2.resize(img,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST)
for i,pth in enumerate(sorted(paths,key=len,reverse=True)):
    pts=np.array([[x,y] for y,x in pth],np.float32)
    ap=cv2.approxPolyDP(pts.reshape(-1,1,2),eps,False)[:,0,:]
    res[i]=[[round(float(x+x0),1),round(float(y+y0),1)] for x,y in ap]
    col=tuple(int(v) for v in np.random.RandomState(i+3).randint(80,255,3))
    cv2.polylines(img,[(ap*sc).astype(np.int32).reshape(-1,1,2)],False,col,1,cv2.LINE_AA)
    cv2.putText(img,str(i),tuple(int(v) for v in ap[len(ap)//2]*sc),0,0.4,col,1)
json.dump(res,open(out+'.json','w'))
cv2.imwrite(out+'.jpg',img,[cv2.IMWRITE_JPEG_QUALITY,90])
print(len(res),'lines; points',sum(len(v) for v in res.values()))
