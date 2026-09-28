# Trace flat-colour backdrop shapes (clouds, ribbons) from the SOURCE frame into simplified outline polygons
# (measurement only: the output is vector geometry + palette names, no pixels).
# usage: trace.py spec.json out.json [vis.png]
import cv2, numpy as np, json, sys
from ungrade import ungrade
spec=json.load(open(sys.argv[1])); out=sys.argv[2]; vis=sys.argv[3] if len(sys.argv)>3 else None
src=cv2.imread(spec.get('frame','ref-117.4.png'))
U=src.astype(np.float32)/255 if spec.get('pre') else ungrade(src, spec.get('t',117.4))
x0,y0,x1,y1=spec['rect']
u=(U[y0:y1,x0:x1]*255).astype(np.uint8)
u=cv2.bilateralFilter(u,7,30,4)
lab=cv2.cvtColor(u,cv2.COLOR_BGR2LAB).astype(np.float32)
pal=spec['palette']  # [[name, hex, kind]] kind: hard|soft|sky|fg
def hex2lab(h):
  h=h.lstrip('#'); b=np.uint8([[[int(h[4:6],16),int(h[2:4],16),int(h[0:2],16)]]]); return cv2.cvtColor(b,cv2.COLOR_BGR2LAB)[0,0].astype(np.float32)
P=np.stack([hex2lab(p[1]) for p in pal])
d=((lab[:,:,None,:]-P[None,None])**2).sum(-1)
# optional: classes allowed only inside zones ("bg" kind = backdrop colours that are never drawn)
names_=[p[0] for p in pal]
if spec.get('zones'):
  allow=np.zeros(d.shape,bool)
  zonal=set()
  for zp,cl in spec['zones']:
    m=np.zeros(d.shape[:2],np.uint8); cv2.fillPoly(m,[np.int32(np.array(zp)-[x0,y0])],1)
    for c_ in cl: allow[...,names_.index(c_)]|=m>0; zonal.add(c_)
  for k_,n_ in enumerate(names_):
    if n_ not in zonal: allow[...,k_]=True
  d[~allow]=1e12
for zp,cl in spec.get('deny',[]):
  m=np.zeros(d.shape[:2],np.uint8); cv2.fillPoly(m,[np.int32(np.array(zp)-[x0,y0])],1)
  for c_ in cl: d[...,names_.index(c_)][m>0]=1e12
L=d.argmin(-1)
# classes allowed only near others: {"cls": [[ref classes], radius]} (e.g. letter outlines only next to letters)
for cn,(refs,rad) in spec.get('near',{}).items():
  ref=np.isin(L,[names_.index(r) for r in refs]).astype(np.uint8)
  ok=cv2.dilate(ref,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*rad+1,2*rad+1)))>0
  k_=names_.index(cn); d[...,k_][~ok]=1e12
  L=d.argmin(-1)
if spec.get('mask'):
  mk=np.zeros(L.shape,np.uint8); cv2.fillPoly(mk,[np.int32(np.array(spec['mask'])-[x0,y0])],1)
  L[mk==0]=names_.index(spec.get('mask_class','sky'))
EXCL=np.zeros(L.shape,np.uint8)
for zp in spec.get('mask_excl',[]):
  cv2.fillPoly(EXCL,[np.int32(np.array(zp)-[x0,y0])],1)
# exclude the area covered by another trace's classes (e.g. the headline lettering), dilated
for ef in spec.get('excl_trace',[]):
  T2=json.load(open(ef['file'])); m2=np.zeros(L.shape,np.uint8)
  for r in T2['polys']:
    if r.get('cls',r['c']) not in ef['classes']: continue
    t2=np.zeros_like(m2); cv2.fillPoly(t2,[np.int32(np.array(r['p']).reshape(-1,2)-[x0,y0])],1); m2^=t2
  m2=cv2.dilate(m2,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*ef.get('dilate',3)+1,)*2))
  m2=cv2.morphologyEx(m2,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*ef.get('close',0)+1,)*2)) if ef.get('close') else m2
  EXCL|=m2
if EXCL.any(): L[EXCL>0]=names_.index(spec.get('mask_class','sky'))
kind=np.array([p[2] for p in pal])
unknown=np.isin(kind[L],['fg','line'])
# thin dark things (cables, lamp arms, outlines) classified as sky are foreground: only broad sky stays sky
ks=int(spec.get('sky_open',9))
if ks>1:
  skym=np.isin(kind[L],spec.get('thin_sky_kinds',['sky'])).astype(np.uint8)
  op=cv2.morphologyEx(skym,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(ks,ks)))
  unknown|=(skym>0)&(op==0)
Lraw=L.copy(); forced=np.zeros(L.shape,np.uint8)
# optional hand masks: polygons forced to a class (or to "fg")
for name,poly in spec.get('force',[]):
  k=[p[0] for p in pal].index(name); m=np.zeros(L.shape,np.uint8)
  cv2.fillPoly(m,[np.int32(np.array(poly)-[x0,y0])],1); L[m>0]=k; forced|=m
  unknown[m>0]=kind[k] in ('fg','line')
# majority filter on known labels
K=len(pal)
def majority(L,known,r):
  votes=np.zeros(L.shape+(K,),np.float32)
  for k in range(K):
    m=((L==k)&known).astype(np.float32)
    votes[...,k]=cv2.boxFilter(m,-1,(r,r),normalize=False)
  return votes.argmax(-1), votes.max(-1)>0
L2,ok=majority(L,~unknown,5)
L2[~ok]=L[~ok]
# fill unknown pixels from the nearest known pixel
known=~np.isin(kind[L2],['fg','line']) & ~unknown
from scipy import ndimage
idx=ndimage.distance_transform_edt(~known,return_distances=False,return_indices=True)
L3=L2[idx[0],idx[1]]
# remove small islands
minA=spec.get('min_area',40)
for it in range(3):
  for k in range(K):
    n,cc,st,_=cv2.connectedComponentsWithStats((L3==k).astype(np.uint8),connectivity=4)
    for i in range(1,n):
      if st[i,4]<minA:
        m=(cc==i); dil=cv2.dilate(m.astype(np.uint8),np.ones((3,3),np.uint8))>0; ring=dil&~m
        if ring.any(): L3[m]=np.bincount(L3[ring],minlength=K).argmax()
# smooth boundaries: per-class masks blurred (sigma 'smooth'), argmax
sg=float(spec.get('smooth',2.5))
acc=np.zeros(L3.shape+(K,),np.float32)
scls=spec.get('smooth_cls',{})
for k in range(K): acc[...,k]=cv2.GaussianBlur((L3==k).astype(np.float32),(0,0),scls.get(pal[k][0],sg))
L3=acc.argmax(-1)
if spec.get('debug'): np.save('L3.npy',L3)
# line strength map: darkness relative to local surroundings (black-hat), for keyline runs
g=cv2.cvtColor((U[y0:y1,x0:x1]*255).astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32)
bh=cv2.morphologyEx(g,cv2.MORPH_BLACKHAT,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
# fitted class colours: median of the pre-grade frame over each class's interior (eroded, away from edges)
fit={}
uu=U[y0:y1,x0:x1]
for k,(name,hx,kd) in enumerate(pal):
  m=((L3==k)&(Lraw==k)&(forced==0)).astype(np.uint8)
  e=cv2.erode(m,np.ones((5,5),np.uint8))
  if e.sum()<30: e=m
  if e.sum()<5: continue
  med=np.median(uu[e>0],axis=0)[::-1]*255
  fit[name]='#%02x%02x%02x'%tuple(int(round(v)) for v in np.clip(med,0,255))
if not spec.get('fit_colors',True): fit={}
eps=spec.get('eps',1.2)
res=[]; REG=[]; REGHEX={}
for k,(name,hx,kd) in enumerate(pal):
  if kd in ('fg','line','sky','bg'): continue
  m=(L3==k).astype(np.uint8)
  if not m.any(): continue
  cs,hier=cv2.findContours(m,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
  zz=np.zeros(L.shape,np.uint8)
  for zp in spec.get('soft_zones',[]): cv2.fillPoly(zz,[np.int32(np.array(zp)-[x0,y0])],1)
  softof={}
  for ci_,(c,h) in enumerate(zip(cs,hier[0])):
    if h[3]>=0: continue
    if kd=='soft': softof[ci_]=1; continue
    mm=np.zeros(L.shape,np.uint8); cv2.drawContours(mm,[c],-1,1,-1)
    softof[ci_]=1 if mm.sum()>0 and (mm&zz).sum()/mm.sum()>0.5 else 0
  regname={}
  if spec.get('region_colors') and kd=='hard':
    ncc,ccl,cst,_=cv2.connectedComponentsWithStats(m,connectivity=8)
    uu_=U[y0:y1,x0:x1]
    for ci_,(c,h) in enumerate(zip(cs,hier[0])):
      if h[3]>=0: continue
      px_,py_=c[0,0]; lb=ccl[py_,px_]
      bx,by,bw,bh_,ar=cst[lb]
      comp=(ccl[by:by+bh_,bx:bx+bw]==lb)
      e=cv2.erode(comp.astype(np.uint8),np.ones((3,3),np.uint8))>0
      if e.sum()<12: e=comp
      med=np.median(uu_[by:by+bh_,bx:bx+bw][e],axis=0)[::-1]*255
      # small regions keep the class colour (their median is dominated by edge blur)
      if ar<spec.get('region_min',60): continue
      labc=cv2.cvtColor(np.uint8([[np.clip(med[::-1],0,255)]]),cv2.COLOR_BGR2LAB)[0,0].astype(np.float32)
      best=None
      for (nm_,lab_) in REG:
        if np.sqrt(((lab_-labc)**2).sum())<spec.get('region_de',3.0): best=nm_; break
      if best is None:
        best='r%d'%len(REG); REG.append((best,labc)); REGHEX[best]='#%02x%02x%02x'%tuple(int(round(v)) for v in np.clip(med,0,255))
      regname[ci_]=best
  for ci_,(c,h) in enumerate(zip(cs,hier[0])):
    if cv2.contourArea(c)<minA: continue
    q=c[:,0,:].astype(np.float32); n=len(q)
    if n>8:
      w=int(spec.get('csmooth',2)); acc2=np.zeros_like(q)
      for o in range(-w,w+1): acc2+=np.roll(q,o,axis=0)
      q=acc2/(2*w+1)
    a=cv2.approxPolyDP(q.reshape(-1,1,2),eps,True)[:,0,:]
    a=np.round(a).astype(int)
    if len(a)<3: continue
    soft=softof.get(ci_ if h[3]<0 else h[3],0)
    rn=regname.get(ci_ if h[3]<0 else h[3],name)
    res.append({'c':rn,'cls':name,'s':soft,'hole':int(h[3]>=0),'p':[int(v) for v in (a+[x0,y0]).ravel()]})
# ink lines inside the backdrop (cloud keylines, stripe separators): black-hat ridge, away from foreground colours
# and forced foreground zones, skeletonized; each skeleton piece becomes a there-and-back ring stroked at its width
lines=[]
if spec.get('lines'):
  from skimage.morphology import skeletonize
  from skimage.filters import apply_hysteresis_threshold
  bhs=cv2.GaussianBlur(bh,(0,0),0.9)
  lm=apply_hysteresis_threshold(bhs,spec.get('line_lo',16),spec.get('line_hi',34)).astype(np.uint8)
  fgcol=np.isin(kind[L],['fg']).astype(np.uint8)
  # only real foreground (big blobs of foreground colour) blocks lines; anti-aliased line pixels can look 'fg'
  fgcol=cv2.morphologyEx(fgcol,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
  n_,cc_,st_,_=cv2.connectedComponentsWithStats(fgcol,connectivity=8)
  for i_ in range(1,n_):
    if st_[i_,4]<spec.get('fg_min',120): fgcol[cc_==i_]=0
  fgz=np.zeros(L.shape,np.uint8)
  for name,poly in spec.get('force',[]):
    cv2.fillPoly(fgz,[np.int32(np.array(poly)-[x0,y0])],1)
  for poly in spec.get('noline',[]):
    cv2.fillPoly(fgz,[np.int32(np.array(poly)-[x0,y0])],1)
  near=cv2.dilate(fgcol,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))|cv2.dilate(fgz,np.ones((5,5),np.uint8))
  lm[near>0]=0
  lm=cv2.morphologyEx(lm,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
  sk=skeletonize(lm>0).astype(np.uint8)
  if spec.get('debug'): cv2.imwrite('dbg-lm.png',np.dstack([lm*255,sk*255,near*120]).astype(np.uint8))
  dt=cv2.distanceTransform(lm,cv2.DIST_L2,3)
  cs,_=cv2.findContours(sk,cv2.RETR_LIST,cv2.CHAIN_APPROX_NONE)
  for c in cs:
    if len(c)<2*spec.get('line_min',14): continue
    q=c[:,0,:].astype(np.float32)
    acc2=np.zeros_like(q)
    for o in range(-2,3): acc2+=np.roll(q,o,axis=0)
    q=acc2/5
    a=cv2.approxPolyDP(q.reshape(-1,1,2),0.8,True)[:,0,:]
    w=float(np.median([2*dt[int(py),int(px)] for px,py in c[:,0,:]]))
    w=max(1.2,min(w*spec.get('line_wk',1.0),5))
    lines.append({'w':round(w,1),'p':[int(round(v)) for v in (a+[x0,y0]).ravel()]})
  print('lines',len(lines),'points',sum(len(l['p'])//2 for l in lines))
# ink as regions: the black-hat ridge mask itself, traced as filled polygons (keeps the taper of each stroke)
if spec.get('ink_regions'):
  from skimage.filters import apply_hysteresis_threshold
  bhs=cv2.GaussianBlur(bh,(0,0),0.7)
  im_=apply_hysteresis_threshold(bhs,spec.get('ink_lo',16),spec.get('ink_hi',34)).astype(np.uint8)
  nz=np.zeros(L.shape,np.uint8)
  for poly in spec.get('noline',[]): cv2.fillPoly(nz,[np.int32(np.array(poly)-[x0,y0])],1)
  if spec.get('mask'):
    mk2=np.zeros(L.shape,np.uint8); cv2.fillPoly(mk2,[np.int32(np.array(spec['mask'])-[x0,y0])],1); nz|=(mk2==0)
  im_[nz>0]=0
  # drop specks
  n_,cc_,st_,_=cv2.connectedComponentsWithStats(im_,connectivity=8)
  for i_ in range(1,n_):
    if st_[i_,4]<spec.get('ink_min',12): im_[cc_==i_]=0
  sm=(cv2.GaussianBlur(im_.astype(np.float32),(0,0),spec.get('ink_smooth',0.6))>0.5).astype(np.uint8)
  inks=spec.get('ink_cols',[['ink_k','#161214']])
  ilab=np.float32([hex2lab(h) for _,h in inks])
  uu8=(U[y0:y1,x0:x1]*255).astype(np.uint8); ulab=cv2.cvtColor(uu8,cv2.COLOR_BGR2LAB).astype(np.float32)
  n_,cc_,st_,_=cv2.connectedComponentsWithStats(sm,connectivity=8)
  cls_of=np.zeros(n_,int)
  byc=spec.get('ink_by_class')
  inkn=[n for n,_ in inks]
  if byc:
    # per pixel: the ink colour follows the colour region the stroke lies on (face lines brown, jacket lines green)
    pix=np.zeros(L3.shape,int)
    for k_,p_ in enumerate(pal[:K]): pix[L3==k_]=inkn.index(byc.get(p_[0],byc.get('*',inkn[0])))
  else:
    pix=np.zeros(L3.shape,int)
    for i_ in range(1,n_):
      cm=(cc_==i_); mcol=np.median(ulab[cm],axis=0); pix[cm]=int(((ilab-mcol)**2).sum(1).argmin())
  nink=0
  for j_,(nm_,hx_) in enumerate(inks):
    pal.append([nm_,hx_,'hard'])
    mm=((sm>0)&(pix==j_)).astype(np.uint8)
    if not mm.any(): continue
    cs,hier=cv2.findContours(mm,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
    for c,h in zip(cs,hier[0]):
      if cv2.contourArea(c)<4: continue
      a=cv2.approxPolyDP(c.astype(np.float32),spec.get('ink_eps',0.5),True)[:,0,:]
      if len(a)<3: continue
      res.append({'c':nm_,'s':0,'hole':int(h[3]>=0),'p':[int(round(v)) for v in (a+[x0,y0]).ravel()]}); nink+=1
  print('ink regions',nink)
if spec.get('ink_strokes'):
  # ink as variable-width strokes along the skeleton of the black-hat ridge mask
  from skimage.filters import apply_hysteresis_threshold
  from skel import paths, smooth_simplify
  bhs=cv2.GaussianBlur(bh,(0,0),0.8)
  im_=apply_hysteresis_threshold(bhs,spec.get('ink_lo',16),spec.get('ink_hi',34)).astype(np.uint8)
  nz=np.zeros(L.shape,np.uint8)
  for poly in spec.get('noline',[]): cv2.fillPoly(nz,[np.int32(np.array(poly)-[x0,y0])],1)
  if spec.get('mask'):
    mk2=np.zeros(L.shape,np.uint8); cv2.fillPoly(mk2,[np.int32(np.array(spec['mask'])-[x0,y0])],1); nz|=(mk2==0)
  nz|=EXCL
  im_[nz>0]=0
  n_,cc_,st_,_=cv2.connectedComponentsWithStats(im_,connectivity=8)
  for i_ in range(1,n_):
    if st_[i_,4]<spec.get('ink_min',12): im_[cc_==i_]=0
  im_=cv2.morphologyEx(im_,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
  dt=cv2.distanceTransform(im_,cv2.DIST_L2,5)
  inks=spec.get('ink_cols',[['ink_k','#161214']]); inkn=[n for n,_ in inks]; byc=spec.get('ink_by_class',{})
  for nm_,hx_ in inks: pal.append([nm_,hx_,'hard'])
  strokes=[]
  for a,w in paths(im_,dt,spec.get('stroke_min',5)):
    a,w=smooth_simplify(a,w,2,spec.get('stroke_eps',0.5))
    if len(a)<2: continue
    mid=a[len(a)//2].astype(int); cls=pal[int(L3[min(mid[1],L3.shape[0]-1),min(mid[0],L3.shape[1]-1)])][0]
    ci=inkn.index(byc.get(cls,byc.get('*',inkn[0])))
    wk=spec.get('ink_wk',1.0)
    strokes.append({'c':inks[ci][0],'p':[round(float(v),1) for v in (a+[x0,y0]).ravel()],'w':[round(float(max(0.5,2*x*wk-spec.get('ink_wsub',0.6))),1) for x in w]})
  print('strokes',len(strokes),'points',sum(len(s_['w']) for s_ in strokes))
print('fitted', {k:(dict((p[0],p[1]) for p in pal)[k],v) for k,v in fit.items() if dict((p[0],p[2]) for p in pal)[k] in ('hard','soft')})
pal_out=[[p[0],fit.get(p[0],p[1]),p[2]] for p in pal]+[[k,v,'hard'] for k,v in REGHEX.items()]
if REGHEX: print('region colours',len(REGHEX))
SHX=spec.get('shift',[0,0])
if SHX!=[0,0]:
  for r in res: r['p']=[v+SHX[i%2] for i,v in enumerate(r['p'])]
  for s_ in (strokes if spec.get('ink_strokes') else []): s_['p']=[round(v+SHX[i%2],1) for i,v in enumerate(s_['p'])]
  spec['rect']=[spec['rect'][0]+SHX[0],spec['rect'][1]+SHX[1],spec['rect'][2]+SHX[0],spec['rect'][3]+SHX[1]]
json.dump({'rect':spec['rect'],'holes':spec.get('holes',[]),'palette':pal_out,'polys':res,'lines':lines,'strokes':strokes if spec.get('ink_strokes') else []},open(out,'w'))
print('polys',len(res),'points',sum(len(r['p'])//2 for r in res))
if vis:
  cols=np.array([[int(p[1][5:7],16),int(p[1][3:5],16),int(p[1][1:3],16)] for p in pal],np.uint8)
  v=cols[L3]
  v[bh>spec.get('line_thr',28)]=(0,0,0)
  cv2.imwrite(vis,cv2.resize(v,None,fx=2,fy=2,interpolation=cv2.INTER_NEAREST))
