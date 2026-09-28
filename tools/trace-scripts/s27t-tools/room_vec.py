# Trace a view of the room from the source (measurement -> vector data): temporal median of a static stretch (removes the
# film grain), un-graded to pre-grade colours; the foreground objects (our own layers, from a mask render) are cut out,
# with a ring of inpainted colour inside each hole so edges never show the underlay. Output: flat colour regions
# (posterized, simplified polygons, region-mean colours) + ink line polygons with their measured colours.
# usage: room_vec.py NAME T0 T1 T_ref maskpng out.js [K] [--extra x,y,x,y,...]  (extra = additional polygon to mask)
import cv2, numpy as np, json, sys
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/tools/trace-scripts/s27t-tools')
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/tools/trace-scripts/s27t-tools')
from common import load
from ungrade import ungrade
a=sys.argv[1:]
NAME=a[0]; T0=float(a[1]); T1=float(a[2]); TR=float(a[3]); MP=a[4]; OUT=a[5]; K=int(a[6]) if len(a)>6 and not a[6].startswith('--') else 40
extra=[]; opts={}; desk=None
i=7
while i<len(a):
    if a[i]=='--extra': extra.append(np.array(list(map(float,a[i+1].split(',')))).reshape(-1,2)); i+=2
    elif a[i]=='--desk': desk=np.array(list(map(float,a[i+1].split(',')))).reshape(-1,2); i+=2
    elif a[i].startswith('--'): opts[a[i][2:]]=a[i+1]; i+=2
    else: i+=1
RING=int(opts.get('ring',18)); DIL=int(opts.get('dil',5)); INKTHR=float(opts.get('ink',16))
if 'medimg' in opts: med=cv2.imread(opts['medimg'])
else:
    n=int(round((T1-T0)/0.04))+1
    fr=np.stack([load(T0+k*0.04) for k in range(n)])
    med=np.median(fr,0).astype(np.uint8) if n>1 else fr[0]
if 'nlm' in opts: med=cv2.fastNlMeansDenoisingColored(med,None,float(opts['nlm']),float(opts['nlm']),5,15)
H,W=med.shape[:2]
m=cv2.imread(MP); obj=~((m[...,2]>240)&(m[...,1]<20)&(m[...,0]>240))
obj=obj.astype(np.uint8)
for p in extra: cv2.fillPoly(obj,[np.int32(p)],1)
obj0=obj.copy()
obj=cv2.dilate(obj,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*DIL+1,2*DIL+1)))
DD=int(opts.get('ddil',0))
if DD and desk is not None:   # on the desk, cut a wider margin (the objects' own shadows go with the objects)
    dm0=np.zeros(obj.shape,np.uint8); cv2.fillPoly(dm0,[np.int32(desk)],1)
    obj|=cv2.dilate(obj0,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*DD+1,2*DD+1)))&dm0
vis=(obj==0).astype(np.uint8)
# ring inside holes: pixels within RING of the visible area; holes on the desk are filled completely (smooth surface)
dist=cv2.distanceTransform(obj,cv2.DIST_L2,5)
cover=((vis>0)|(dist<=RING)).astype(np.uint8)
if desk is not None:
    dm=np.zeros(obj.shape,np.uint8); cv2.fillPoly(dm,[np.int32(desk)],1); cover|=dm&(dist<=float(opts.get('fill',1e9))).astype(np.uint8)
if 'fillall' in opts: cover|=(dist<=float(opts['fillall'])).astype(np.uint8)

# ---- ink: dark thin lines on the grain-free median
g=cv2.cvtColor(med,cv2.COLOR_BGR2GRAY)
bh=cv2.morphologyEx(g,cv2.MORPH_BLACKHAT,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9))).astype(np.float32)
gs=cv2.GaussianBlur(g.astype(np.float32),(0,0),0.6)
ink=((bh>INKTHR)&(gs<200)).astype(np.float32)*(dist==0)*(cv2.distanceTransform(vis,cv2.DIST_L2,5)>3)
IM=int(opts.get('inkmin',6))
nn,cc,st,_=cv2.connectedComponentsWithStats((ink>0).astype(np.uint8),connectivity=8)
small=np.nonzero((st[1:,4]<IM)|((np.maximum(st[1:,2],st[1:,3])<4)&(st[1:,4]<IM*2)))[0]+1
if len(small): ink[np.isin(cc,small)]=0
# ---- colour: pre-grade, ink inpainted, holes inpainted, smoothed
U=ungrade(med,TR)
u8=np.clip(U*255+0.5,0,255).astype(np.uint8)
inpm=((ink>0).astype(np.uint8)); inpm=cv2.dilate(inpm,np.ones((3,3),np.uint8))
inpm=np.maximum(inpm,obj)
clean=cv2.inpaint(u8,(inpm&(1-obj))*255,6,cv2.INPAINT_TELEA)
clean=cv2.bilateralFilter(clean,9,18,7)
# holes: push-pull fill (smooth membrane from the surrounding colours), then relaxed
def pushpull(I,M):
    h,w=M.shape
    if M.min()>0 or min(h,w)<3: return I if M.min()>0 else np.where(M[...,None]>0,I,(I*M[...,None]).sum((0,1))/max(M.sum(),1e-6))
    w2,h2=max(1,w//2),max(1,h//2)
    Ic=cv2.resize(I*M[...,None],(w2,h2),interpolation=cv2.INTER_AREA); Mc=cv2.resize(M,(w2,h2),interpolation=cv2.INTER_AREA)
    Ic=Ic/np.maximum(Mc,1e-6)[...,None]; Mc=(Mc>0.02).astype(np.float32)
    F=pushpull(Ic,Mc); up=cv2.resize(F,(w,h),interpolation=cv2.INTER_LINEAR)
    R=np.where(M[...,None]>0,I,up)
    for _ in range(12):   # relax at this level (coarse-to-fine harmonic fill)
        R=np.where(M[...,None]>0,I,cv2.blur(R,(3,3)))
    return R
cf0=clean.astype(np.float32); Mv=(obj==0).astype(np.float32)
# fill sources: visible pixels a few px clear of the cut (object rims and outlines never leak into the fill)
Ms=(cv2.distanceTransform(vis,cv2.DIST_L2,5)>float(opts.get('srcgap',7))).astype(np.float32)
if 'srcmin' in opts:   # dark ink/hair pixels never feed the fill (they would spread dark rings into the holes)
    lum=cv2.cvtColor(cf0.astype(np.uint8),cv2.COLOR_BGR2GRAY)
    dark=cv2.dilate((lum<float(opts['srcmin'])).astype(np.uint8),np.ones((7,7),np.uint8))
    Ms*=(1-dark).astype(np.float32)
fillI=pushpull(cf0,Ms)
for it in range(40):   # relax the fill (Jacobi) with the source pixels fixed
    fillI=np.where(Ms[...,None]>0,cf0,cv2.blur(fillI,(9,9)))
fillI=np.where(Mv[...,None]>0,cf0,fillI)
clean=np.clip(fillI,0,255).astype(np.uint8)
lab=cv2.cvtColor(clean,cv2.COLOR_BGR2LAB).astype(np.float32)
ys,xs=np.nonzero(cover)
cv2.setRNGSeed(5)
_,lb,cen=cv2.kmeans(lab[ys,xs],K,None,(cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER,60,0.2),3,cv2.KMEANS_PP_CENTERS)
Lb=np.full(g.shape,-1,np.int32); Lb[ys,xs]=lb.ravel()
for it in range(2):
    votes=np.stack([cv2.boxFilter((Lb==k).astype(np.float32),-1,(5,5)) for k in range(K)])
    Lb=np.where(cover>0,np.argmax(votes,0),-1)
# absorb small specks into their neighbours (nearest large-region label), so the regions tile the cover area with no gaps
MINA=int(opts.get('minarea',20))
bad=np.zeros(g.shape,np.uint8)
for k in range(K):
    nn,cc,st,_=cv2.connectedComponentsWithStats((Lb==k).astype(np.uint8),connectivity=4)
    small=np.nonzero(st[1:,4]<MINA)[0]+1
    if len(small): bad[np.isin(cc,small)]=1
bad&=cover
if bad.any():
    src_=((bad>0)|(cover==0)).astype(np.uint8)
    _,lab_=cv2.distanceTransformWithLabels(src_,cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)
    zy,zx=np.nonzero(src_==0)            # zero pixels in raster order = labels 1..N
    idx=lab_[bad>0]-1
    Lb[bad>0]=Lb[zy[idx],zx[idx]]
S=3
def contours_of(mk, eps, minarea, smooth):
    M=cv2.resize(mk.astype(np.float32),None,fx=S,fy=S,interpolation=cv2.INTER_LINEAR)
    if smooth: M=cv2.GaussianBlur(M,(0,0),smooth*S)
    B=(M>0.5).astype(np.uint8)
    cnts,hier=cv2.findContours(B,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
    out=[]
    if hier is None: return out
    for i,c in enumerate(cnts):
        if hier[0][i][3]>=0: continue
        if cv2.contourArea(c)<minarea*S*S: continue
        o=cv2.approxPolyDP(c,eps*S,True).reshape(-1,2)/S
        holes=[]; j=hier[0][i][2]
        while j>=0:
            if cv2.contourArea(cnts[j])>=minarea*S*S*0.5: holes.append(cv2.approxPolyDP(cnts[j],eps*S,True).reshape(-1,2)/S)
            j=hier[0][j][0]
        out.append((o,holes))
    return out
regions=[]
cf=clean.astype(np.float32)
for k in range(K):
    for o,h in contours_of((Lb==k),float(opts.get('eps',0.9)),3,0.9):
        M=np.zeros(g.shape,np.uint8); cv2.fillPoly(M,[np.int32(np.round(o))],1)
        for hh in h: cv2.fillPoly(M,[np.int32(np.round(hh))],0)
        M&=(Lb==k).astype(np.uint8)
        yy,xx=np.nonzero(M)
        if len(xx)==0: continue
        col=cf[yy,xx].mean(0)[::-1]
        regions.append({'c':'#%02x%02x%02x'%tuple(int(v) for v in col),'a':int(len(xx)),'p':o,'h':h})
regions.sort(key=lambda r:-r['a'])
# ---- ink polygons with measured colours (pre-grade, from the un-inpainted median), grouped into a few tones
inkC=contours_of(ink,0.35,1.2,0.45)
Uf=U.astype(np.float32)*255
inks=[]
for o,h in inkC:
    M=np.zeros(g.shape,np.uint8); cv2.fillPoly(M,[np.int32(np.round(o))],1)
    yy,xx=np.nonzero(M&(ink>0).astype(np.uint8))
    if len(xx)==0: yy,xx=np.nonzero(M)
    if len(xx)==0: continue
    # the line's core colour: darker quartile
    v=Uf[yy,xx]; lum=v.sum(1); sel=v[lum<=np.percentile(lum,40)] if len(v)>4 else v
    inks.append((o,h,sel.mean(0)[::-1]))
NI=int(opts.get('inktones',8))
if len(inks)>=NI:
    Z=np.float32([c for _,_,c in inks]); cv2.setRNGSeed(2)
    _,il,icen=cv2.kmeans(Z,NI,None,(cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER,40,0.5),3,cv2.KMEANS_PP_CENTERS)
    groups={}
    for (o,h,c),l in zip(inks,il.ravel()): groups.setdefault(int(l),[]).append((o,h))
    inkg=[('#%02x%02x%02x'%tuple(int(v) for v in icen[l]),groups[l]) for l in groups]
else:
    inkg=[('#%02x%02x%02x'%tuple(int(v) for v in c),[(o,h)]) for o,h,c in inks]
def fl(p): return [int(round(v*2)) for xy in p for v in xy]
data={'regions':[[r['c'],fl(r['p'])]+[fl(x) for x in r['h']] for r in regions],
      'ink':[[c]+[[fl(o)]+[fl(x) for x in h] for o,h in polys] for c,polys in inkg]}
js=[f"// s27 room view {NAME}: traced from the source (temporal median {T0}-{T1} s, un-graded), foreground objects cut out.",
f"// Frame px x2 (integers). REGIONS: [colour, outer, ...holes]; INK: [colour, [outer, ...holes], ...]. Generated by",
f"// snapshots/s27-k-tools/room_vec.py; painted by code in room.js.",
f"export const {NAME}_REGIONS = "+json.dumps(data['regions'],separators=(',',':'))+";",
f"export const {NAME}_INK = "+json.dumps(data['ink'],separators=(',',':'))+";"]
open(OUT,'w').write("\n".join(js)+"\n")
import os
print('regions',len(regions),'ink polys',len(inks),'bytes',os.path.getsize(OUT))
# preview raster
pv=np.zeros_like(med)
for r in regions:
    c=r['c']; col=(int(c[5:7],16),int(c[3:5],16),int(c[1:3],16))
    mk=np.zeros(g.shape,np.uint8); cv2.fillPoly(mk,[np.int32(np.round(r['p']))],1)
    for hh in r['h']: cv2.fillPoly(mk,[np.int32(np.round(hh))],0)
    pv[mk>0]=col
for c,polys in inkg:
    col=(int(c[5:7],16),int(c[3:5],16),int(c[1:3],16))
    for o,h in polys:
        mk=np.zeros(g.shape,np.uint8); cv2.fillPoly(mk,[np.int32(np.round(o))],1)
        for hh in h: cv2.fillPoly(mk,[np.int32(np.round(hh))],0)
        pv[mk>0]=col
cv2.imwrite(OUT.replace('.js','_prev.png'),pv)
cv2.imwrite(OUT.replace('.js','_ug.png'),u8)
