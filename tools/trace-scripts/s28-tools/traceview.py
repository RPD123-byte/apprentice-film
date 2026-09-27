# Vector trace of an area of a SOURCE frame (measurement -> drawing data):
#   regions: flat-colour areas of the ink-free colour field (felzenszwalb segmentation + RAG merge), each with a
#            fitted linear colour gradient (c0 at p0 -> c1 at p1)
#   ink    : dark line art as filled polygons with measured colour (two tone levels)
# Usage: traceview.py spec.json out.json [--overlay img]
# spec: {"t":T, "area":[poly..], "exclude":[poly..], "fill_hidden":[poly..], "scale":..., "min_size":..., "merge":dE,
#        "ink":[{lmax,contrast}..], "key":"name"}
import sys,json,cv2,numpy as np
from skimage.segmentation import felzenszwalb
sys.path.insert(0,'snapshots/s28-tools')
from grade import pre_frame,hexc
def rings_of(mask,eps,min_area,min_hole=6,S=1):
    cs,hier=cv2.findContours(mask,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
    out=[]
    if hier is None: return out
    hier=hier[0]
    def simp(c):
        c=c.reshape(-1,2).astype(np.float32)
        if len(c)>6:
            n=len(c); idx=(np.arange(n)[:,None]+np.arange(-1,2)[None])%n; c=c[idx].mean(1)
        ap=cv2.approxPolyDP(c.reshape(-1,1,2),eps*S,True).reshape(-1,2)/S
        return [[round(float(x),1),round(float(y),1)] for x,y in ap]
    for i,c in enumerate(cs):
        if hier[i][3]>=0: continue
        if cv2.contourArea(c)/(S*S)<min_area: continue
        rs=[simp(c)]
        j=hier[i][2]
        while j>=0:
            if cv2.contourArea(cs[j])/(S*S)>=min_hole:
                r=simp(cs[j])
                if len(r)>=3: rs.append(r)
            j=hier[j][0]
        if len(rs[0])>=3: out.append(rs)
    return out
def inkmask(pre,lmax=0.62,contrast=0.10):
    L=cv2.GaussianBlur(0.299*pre[...,0]+0.587*pre[...,1]+0.114*pre[...,2],(0,0),0.7)
    bg=cv2.dilate(L,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(11,11))); bg=cv2.GaussianBlur(bg,(0,0),3)
    return ((L<lmax)&((bg-L)>contrast)) | (L<0.2)
def main():
    spec=json.load(open(sys.argv[1])); outp=sys.argv[2]
    t=spec['t']; pre=pre_frame(t).astype(np.float32); H,W=pre.shape[:2]
    area=np.zeros((H,W),np.uint8)
    for p in spec['area']: cv2.fillPoly(area,[np.int32(p)],255)
    for p in spec.get('exclude',[]): cv2.fillPoly(area,[np.int32(p)],0)
    hidden=np.zeros((H,W),np.uint8)
    for p in spec.get('fill_hidden',[]): cv2.fillPoly(hidden,[np.int32(p)],255)
    # ink-free colour field
    im=inkmask(pre,**spec.get('inkfree',{}))
    im=cv2.dilate(im.astype(np.uint8)*255,np.ones((3,3),np.uint8))
    p8=(pre*255).astype(np.uint8)
    base=cv2.inpaint(p8,im|hidden,5,cv2.INPAINT_TELEA)
    if hidden.any():
        # big hidden areas: smoother fill by repeated blur-diffusion from the surroundings
        known=((hidden==0)&(im==0)).astype(np.float32)
        acc=base.astype(np.float32)*known[...,None]; wsum=known.copy()
        for s in (4,8,16,32,64):
            a=cv2.GaussianBlur(acc,(0,0),s); w=cv2.GaussianBlur(wsum,(0,0),s)
            fillv=a/np.maximum(w[...,None],1e-4)
            m=(hidden>0)&(w>0.02)
            b2=base.astype(np.float32); b2[m]=fillv[m]; base=b2.clip(0,255).astype(np.uint8)
    base=cv2.medianBlur(base,5)
    base=cv2.pyrMeanShiftFiltering(np.ascontiguousarray(base[...,::-1]),spec.get('sp',10),spec.get('sr',14))[...,::-1]
    base=np.ascontiguousarray(base)
    lab=cv2.cvtColor(base[...,::-1],cv2.COLOR_BGR2LAB)
    seg=felzenszwalb(lab,scale=spec.get('scale',300),sigma=0.8,min_size=spec.get('min_size',250))
    seg=seg+1; seg[area==0]=0
    # merge adjacent segments with similar mean colour (greedy union-find)
    labf=lab.astype(np.float32)
    n=seg.max()+1
    cnt=np.bincount(seg.ravel(),minlength=n).astype(np.float64)
    means=np.stack([np.bincount(seg.ravel(),weights=labf[...,k].ravel(),minlength=n) for k in range(3)],1)/np.maximum(cnt[:,None],1)
    parent=np.arange(n)
    def find(a):
        while parent[a]!=a: parent[a]=parent[parent[a]]; a=parent[a]
        return a
    pairs=set()
    for a,b in [(seg[:,:-1],seg[:,1:]),(seg[:-1,:],seg[1:,:])]:
        m=(a!=b)&(a>0)&(b>0)
        pairs|=set(zip(a[m].tolist(),b[m].tolist()))
    thr=spec.get('merge',0.0)
    ch=True
    while ch:
        ch=False
        for a,b in sorted(pairs,key=lambda p:np.linalg.norm(means[p[0]]-means[p[1]])):
            ra,rb=find(a),find(b)
            if ra==rb: continue
            if np.linalg.norm(means[ra]-means[rb])<thr:
                tot=cnt[ra]+cnt[rb]; means[ra]=(means[ra]*cnt[ra]+means[rb]*cnt[rb])/tot; cnt[ra]=tot; parent[rb]=ra; ch=True
    lut=np.array([find(i) for i in range(n)]); seg=lut[seg]; seg[area==0]=0
    regions=[]
    ys,xs=np.mgrid[0:H,0:W]
    basef=base.astype(np.float32)/255
    for sid in np.unique(seg):
        if sid==0: continue
        m=(seg==sid).astype(np.uint8)*255
        rs_all=rings_of(m,spec.get('eps',1.2),spec.get('min_area',30))
        if not rs_all: continue
        px=m>0
        # fit the colour to the real (ungraded) source pixels of the region, leaving out ink and hidden pixels;
        # the smoothed field is only a fallback where too few clean pixels remain
        clean=px&(im==0)&(hidden==0)
        if clean.sum()>=max(12,0.25*px.sum()): px=clean; src_=pre
        else: src_=basef
        X=xs[px].astype(np.float32); Y=ys[px].astype(np.float32); Cc=src_[px]
        # linear colour fit c = a + b*(x-xm) + c*(y-ym)
        xm,ym=X.mean(),Y.mean()
        A=np.stack([np.ones_like(X),X-xm,Y-ym],1)
        coef,*_=np.linalg.lstsq(A,Cc,rcond=None)
        g=coef[1:]                     # 2x3: d colour / dx, dy
        # gradient direction = direction of max luminance change
        lum=np.array([0.299,0.587,0.114])
        gl=g@lum; gn=np.hypot(*gl)
        ext=max(X.max()-X.min(),Y.max()-Y.min())/2
        if gn*ext<0.02:   # flat
            c=np.median(Cc,0); reg={'c':hexc(c)}
        else:
            d=gl/gn
            proj=(X-xm)*d[0]+(Y-ym)*d[1]; s0,s1=np.percentile(proj,2),np.percentile(proj,98)
            c0=coef[0]+g.T@(d*s0); c1=coef[0]+g.T@(d*s1)
            reg={'c':hexc(np.clip(c0,0,1)),'c1':hexc(np.clip(c1,0,1)),'g':[round(float(xm+d[0]*s0),1),round(float(ym+d[1]*s0),1),round(float(xm+d[0]*s1),1),round(float(ym+d[1]*s1),1)]}
        for rs in rs_all:
            r=dict(reg); r['r']=rs; regions.append(r)
    # ink
    S=2
    P2=cv2.resize(pre,None,fx=S,fy=S,interpolation=cv2.INTER_CUBIC)
    L=cv2.GaussianBlur(0.299*P2[...,0]+0.587*P2[...,1]+0.114*P2[...,2],(0,0),0.7*S)
    bg=cv2.dilate(L,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(int(10*S)+1,)*2)); bg=cv2.GaussianBlur(bg,(0,0),3*S)
    # no ink inside the hidden parts (behind the figure / lid): those are filled from the surroundings only
    area_ink=area.copy(); area_ink[hidden>0]=0
    area2=cv2.resize(area_ink,(W*S,H*S),interpolation=cv2.INTER_NEAREST)
    ink=[]
    for li,lay in enumerate(spec.get('ink',[{"lmax":0.62,"contrast":0.10},{"lmax":0.28}])):
        mm0=(L<lay['lmax'])
        if 'contrast' in lay: mm0&=(bg-L)>lay['contrast']
        mm0=(mm0&(area2>0)).astype(np.uint8)*255
        for rs in rings_of(mm0,lay.get('eps',0.7),lay.get('min_area',4),2,S=S):
            mm=np.zeros((H*S,W*S),np.uint8); cv2.fillPoly(mm,[np.int32(np.array(rs[0])*S)],255)
            for h_ in rs[1:]: cv2.fillPoly(mm,[np.int32(np.array(h_)*S)],0)
            px=P2[(mm>0)&(mm0>0)]
            col=np.median(px,0) if len(px) else np.zeros(3)
            ink.append({'c':hexc(col),'l':li,'r':rs})
    res={'t':t,'regions':regions,'ink':ink}
    json.dump(res,open(outp,'w'),separators=(',',':'))
    print('regions',len(regions),'ink',len(ink),'pts',sum(len(r) for f in regions for r in f['r'])+sum(len(r) for f in ink for r in f['r']))
    if '--overlay' in sys.argv:
        vis=np.zeros_like(p8)
        rng=np.random.default_rng(0); cols=rng.integers(0,255,(seg.max()+1,3))
        vis=cols[seg].astype(np.uint8); vis[seg==0]=0
        cv2.imwrite(sys.argv[sys.argv.index('--overlay')+1],np.hstack([base[...,::-1],vis]))
main()
