# Build figure data for one key time: region polygons (colour classes + clips) and black components.
# Usage: extract.py T spec.json out.json [--overlay out.jpg]
import sys,json,cv2,numpy as np
sys.path.insert(0,'snapshots/s28-tools')
from grade import grab
from classes import classify
def smooth_contour(c,k=2):
    c=c.reshape(-1,2).astype(np.float32); n=len(c)
    if n<5: return c
    idx=(np.arange(n)[:,None]+np.arange(-k,k+1)[None])%n
    return c[idx].mean(1)
def simplify(c,eps):
    return cv2.approxPolyDP(c.astype(np.float32).reshape(-1,1,2),eps,True).reshape(-1,2)
def snap_out(c,dark,lo=-3,hi=8,step=4):
    # move contour points along the outward normal onto the darkest (ink) point within [lo,hi] px
    c=c.reshape(-1,2).astype(np.float32)
    d=np.r_[0,np.cumsum(np.linalg.norm(np.diff(np.vstack([c,c[:1]]),axis=0),axis=1))]
    n=max(8,int(d[-1]/step)); s=np.linspace(0,d[-1],n,endpoint=False)
    cc=np.vstack([c,c[:1]])
    q=np.stack([np.interp(s,d,cc[:,0]),np.interp(s,d,cc[:,1])],1)
    area=0.5*np.sum(q[:,0]*np.roll(q[:,1],-1)-np.roll(q[:,0],-1)*q[:,1])
    tg=np.roll(q,-1,0)-np.roll(q,1,0); tg/=np.linalg.norm(tg,axis=1,keepdims=True)+1e-9
    nor=np.stack([tg[:,1],-tg[:,0]],1)*(1 if area>0 else -1)
    offs=np.arange(lo,hi+0.5,0.5)
    X=q[:,None,0]+nor[:,None,0]*offs[None]; Y=q[:,None,1]+nor[:,None,1]*offs[None]
    H,W=dark.shape
    v=dark[np.clip(Y.round().astype(int),0,H-1),np.clip(X.round().astype(int),0,W-1)]
    best=offs[np.argmax(v,1)]
    bp=np.pad(best,(3,),mode='wrap'); best=np.array([np.median(bp[j:j+7]) for j in range(len(best))])
    q=q+nor*best[:,None]
    return q
def main():
    t=float(sys.argv[1]); spec=json.load(open(sys.argv[2])); outp=sys.argv[3]
    refs={k:tuple(int(v[i:i+2],16) for i in (1,3,5)) for k,v in spec['refs'].items()}
    L,names=classify(t,refs,spec.get('blur',7))
    res={'regions':{},'black':[]}
    union=np.zeros(L.shape,np.uint8)
    f=grab(t); o=f.copy()
    gg=cv2.GaussianBlur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.2); dark=255-gg
    for name,s in spec['regions'].items():
        m=np.isin(L,[names.index(c) for c in s['classes']]).astype(np.uint8)*255
        if 'poly' in s:
            m=np.zeros_like(m); cv2.fillPoly(m,[np.int32(s['poly'])],255)
        if s.get('close'): k=s['close']; m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*k+1,)*2))
        if 'clip' in s:
            cm=np.zeros_like(m); cv2.fillPoly(cm,[np.int32(s['clip'])],255); m&=cm
        for cut in s.get('cuts',[]): cv2.polylines(m,[np.int32(cut)],False,0,3)
        n,lab=cv2.connectedComponents(m,connectivity=4)
        x,y=s['seed']; lid=lab[y,x]
        if lid==0: print(name,'seed miss',file=sys.stderr); continue
        mm=(lab==lid).astype(np.uint8)*255
        if s.get('grow'): k=s['grow']; mm=cv2.dilate(mm,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*k+1,)*2))
        union|=mm
        cs,_=cv2.findContours(mm,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
        c=max(cs,key=cv2.contourArea)
        c=smooth_contour(c,s.get('smooth',2))
        if s.get('snap'): c=smooth_contour(snap_out(c,dark,*s.get('snaprange',[-3,8])),2)
        p=simplify(c,s.get('eps',1.2))
        res['regions'][name]=[[round(float(a),1),round(float(b),1)] for a,b in p]
        cv2.polylines(o,[np.int32(p).reshape(-1,1,2)],True,(0,0,255),1)
    if 'black' in spec:
        b=spec['black']
        m=(L==names.index('black')).astype(np.uint8)*255
        cm=np.zeros_like(m); cv2.fillPoly(cm,[np.int32(b['clip'])],255); m&=cm
        if b.get('open'): k=b['open']; m=cv2.morphologyEx(m,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*k+1,)*2))
        union|=m
        cs,hier=cv2.findContours(m,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
        for i,c in enumerate(cs):
            a=cv2.contourArea(c)
            if a<b.get('min_area',60): continue
            hole=hier[0][i][3]>=0
            p=simplify(smooth_contour(c,1),b.get('eps',0.9))
            if len(p)<3: continue
            res['black'].append({'hole':bool(hole),'pts':[[round(float(x),1),round(float(y),1)] for x,y in p]})
            cv2.polylines(o,[np.int32(p).reshape(-1,1,2)],True,(255,0,255) if not hole else (0,255,0),1)
    if 'silhouette' in spec:
        k=spec['silhouette'].get('close',6)
        u=cv2.morphologyEx(union,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*k+1,)*2))
        cs,_=cv2.findContours(u,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
        sil=[]
        for c in cs:
            if cv2.contourArea(c)<2000: continue
            c=smooth_contour(c,2); c=smooth_contour(snap_out(c,dark,-2,6),2)
            p=simplify(c,1.0); sil.append([[round(float(a),1),round(float(b),1)] for a,b in p])
            cv2.polylines(o,[np.int32(p).reshape(-1,1,2)],True,(0,255,255),1)
        res['silhouette']=sil
    json.dump(res,open(outp,'w'))
    if '--overlay' in sys.argv: cv2.imwrite(sys.argv[sys.argv.index('--overlay')+1],o)
    print({k:len(v) for k,v in res['regions'].items()},'black',len(res['black']))
if __name__=='__main__': main()
