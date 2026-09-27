# Generic figure "key drawing" extraction at one SOURCE time (measurement -> vector data):
#   sil   : figure silhouette rings (colour classes of the figure, connected to seeds, minus exclusions)
#   fills : palette-class regions inside the silhouette (my palette; drawn soft for shading classes)
#   ink   : vector trace of the ink (two tone levels) inside the silhouette
# Usage: figkey.py spec.json out.json [--overlay img]
import sys,json,cv2,numpy as np
sys.path.insert(0,'snapshots/s28-tools')
from grade import pre_frame,hexc
def lab_of(hexs): return np.array([cv2.cvtColor(np.uint8([[[int(h[5:7],16),int(h[3:5],16),int(h[1:3],16)]]]),cv2.COLOR_BGR2LAB)[0,0] for h in hexs],np.float32)
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
def main():
    spec=json.load(open(sys.argv[1])); outp=sys.argv[2]
    t=spec['t']; pre=pre_frame(t); H,W=pre.shape[:2]
    p8=(pre*255).astype(np.uint8)
    med=cv2.medianBlur(p8,spec.get('median',7))
    lab=cv2.cvtColor(med[...,::-1],cv2.COLOR_BGR2LAB).astype(np.float32)
    pal=spec['palette']; names=list(pal.keys()); PL=lab_of(list(pal.values()))
    room=spec.get('room',{}); RL=lab_of(list(room.values())) if room else np.zeros((0,3),np.float32)
    allL=np.vstack([PL,RL])
    d=((lab[:,:,None,:]-allL[None,None])**2).sum(-1)
    cls=np.argmin(d,2)
    fig=(cls<len(names)).astype(np.uint8)*255
    excl=np.zeros((H,W),np.uint8)
    for poly in spec.get('exclude',[]): cv2.fillPoly(excl,[np.int32(poly)],255)
    fig[excl>0]=0
    if 'clip' in spec:
        cm=np.zeros((H,W),np.uint8); cv2.fillPoly(cm,[np.int32(spec['clip'])],255); fig&=cm
    k=spec.get('close',4)
    fig=cv2.morphologyEx(fig,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*k+1,)*2))
    fig=cv2.morphologyEx(fig,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
    n,labm=cv2.connectedComponents(fig)
    keep=set(labm[y,x] for x,y in spec['seeds'])-{0}
    sil=np.isin(labm,list(keep)).astype(np.uint8)*255
    # fill holes
    cs,_=cv2.findContours(sil,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    silf=np.zeros_like(sil); cv2.drawContours(silf,cs,-1,255,-1)
    for poly in spec.get('holes',[]): cv2.fillPoly(silf,[np.int32(poly)],0)
    silf[excl>0]=0
    res={'t':t,'sil':rings_of(silf,1.0,500)}
    # fills: classes inside silhouette (base = first palette entry fills the whole silhouette)
    inside=silf>0
    fills=[]
    for ci,name in enumerate(names[1:],1):
        m=((cls==ci)&inside).astype(np.uint8)*255
        m=cv2.morphologyEx(m,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3)))
        for rs in rings_of(m,1.2,spec.get('min_fill',40)):
            fills.append({'k':name,'r':rs})
    res['fills']=fills
    # ink: two tone levels inside the silhouette (dilated slightly to keep the outline)
    S=2
    P2=cv2.resize(pre,None,fx=S,fy=S,interpolation=cv2.INTER_CUBIC)
    L=cv2.GaussianBlur(0.299*P2[...,0]+0.587*P2[...,1]+0.114*P2[...,2],(0,0),0.7*S)
    bg=cv2.dilate(L,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(int(10*S)+1,)*2)); bg=cv2.GaussianBlur(bg,(0,0),3*S)
    area=cv2.dilate(silf,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))
    area[excl>0]=0
    area2=cv2.resize(area,(W*S,H*S),interpolation=cv2.INTER_NEAREST)
    ink=[]
    for li,lay in enumerate(spec.get('ink',[{"lmax":0.62,"contrast":0.10},{"lmax":0.28}])):
        m=(L<lay['lmax'])
        if 'contrast' in lay: m&=(bg-L)>lay['contrast']
        m=(m&(area2>0)).astype(np.uint8)*255
        for rs in rings_of(m,lay.get('eps',0.7),lay.get('min_area',4),2,S=S):
            mm=np.zeros((H*S,W*S),np.uint8); cv2.fillPoly(mm,[np.int32(np.array(rs[0])*S)],255)
            for h_ in rs[1:]: cv2.fillPoly(mm,[np.int32(np.array(h_)*S)],0)
            px=P2[(mm>0)&(m>0)]
            col=np.median(px,0) if len(px) else np.zeros(3)
            ink.append({'c':hexc(col),'l':li,'r':rs})
    res['ink']=ink
    json.dump(res,open(outp,'w'),separators=(',',':'))
    print('sil',len(res['sil']),'fills',len(fills),'ink',len(ink),'pts',sum(len(r) for f in fills for rs in [f['r']] for r in rs)+sum(len(r) for f in ink for r in f['r']))
    if '--overlay' in sys.argv:
        o=cv2.cvtColor(p8[...,::-1].copy(),cv2.COLOR_RGB2BGR) if False else (pre[...,::-1]*255).astype(np.uint8).copy()
        cols=[tuple(int(v) for v in np.uint8([[[int(h[5:7],16),int(h[3:5],16),int(h[1:3],16)]]])[0,0]) for h in pal.values()]
        post=np.zeros_like(o); post[:]=(40,40,40)
        post[inside]=cols[0]
        for ci in range(1,len(names)):
            post[(cls==ci)&inside]=cols[ci]
        cv2.imwrite(sys.argv[sys.argv.index('--overlay')+1],np.hstack([o,post]))
main()
