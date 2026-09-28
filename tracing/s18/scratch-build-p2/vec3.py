# single-threshold outline trace with holes; one measured value per connected ink shape
import numpy as np, cv2, sys, time
sys.path.insert(0,'.')
from grade import *
def trace(P, thr=0.4, up=4, eps=0.45, minarea=1.0, dil=1, mask=None):
    Hh,Ww=P.shape
    B=(P>thr).astype(np.uint8)
    if mask is not None: B&=mask
    U=cv2.resize(P,(Ww*up,Hh*up),interpolation=cv2.INTER_CUBIC)
    BU=(U>thr).astype(np.uint8)
    if mask is not None: BU&=cv2.resize(mask,(Ww*up,Hh*up),interpolation=cv2.INTER_NEAREST)
    cs,hier=cv2.findContours(BU,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
    hier=hier[0] if hier is not None else []
    groups=[]
    # component values from the 1x mask
    n,lab=cv2.connectedComponents(B,connectivity=8)
    Pd=P
    for i,c in enumerate(cs):
        if hier[i][3]!=-1: continue   # holes handled with their parent
        rings=[c]; j=hier[i][2]
        while j!=-1: rings.append(cs[j]); j=hier[j][0]
        out=[]
        for r in rings:
            a=cv2.approxPolyDP(r,eps*up,True).reshape(-1,2).astype(np.float32)
            if len(a)<3: continue
            out.append((a+0.5)/up-0.5)
        if not out: continue
        ar=abs(cv2.contourArea(out[0]))
        if ar<minarea: continue
        groups.append(out)
    # value per group: mean of P over the group's filled area, dilated by `dil` px for mass
    vals=[]
    for g in groups:
        x0,y0=np.floor(g[0].min(0)).astype(int)-3; x1,y1=np.ceil(g[0].max(0)).astype(int)+4
        x0=max(x0,0); y0=max(y0,0); x1=min(x1,Ww); y1=min(y1,Hh)
        m=np.zeros((y1-y0,x1-x0),np.uint8)
        cv2.fillPoly(m,[np.round((r-[x0,y0])*16).astype(np.int32) for r in g],1,shift=4)
        if m.sum()==0: vals.append(thr); continue
        md=cv2.dilate(m,np.ones((2*dil+1,2*dil+1),np.uint8)) if dil>0 else m
        v=float((P[y0:y1,x0:x1]*md).sum()/m.sum())
        vals.append(min(1.0,v))
    return groups,vals
def raster(groups,vals,H=H,W=W,ss=4,bg=0.0,canvas=None):
    if canvas is None: canvas=np.full((H,W),bg,np.float32)
    # bucket by value to limit passes
    q=np.round(np.array(vals)*32)/32
    for v in np.unique(q):
        m=np.zeros((H*ss,W*ss),np.uint8)
        pts=[np.round(((r+0.5)*ss-0.5)*16).astype(np.int32) for g,qq in zip(groups,q) if qq==v for r in g]
        cv2.fillPoly(m,pts,255,shift=4)
        cov=cv2.resize(m,(W,H),interpolation=cv2.INTER_AREA).astype(np.float32)/255
        canvas=canvas*(1-cov)+v*cov
    return canvas
def score(canvas,P,t):
    F=forward(canvas,t); G=forward(P,t)
    return (np.abs(canvas-P).mean()*255, np.abs(cv2.GaussianBlur(F,(0,0),6)-cv2.GaussianBlur(G,(0,0),6)).mean()*255,
            np.abs(cv2.GaussianBlur(F,(0,0),1.5)-cv2.GaussianBlur(G,(0,0),1.5)).mean()*255)
if __name__=='__main__':
    P=np.load(sys.argv[4] if len(sys.argv)>4 else 'bgA_P.npy')
    thr=float(sys.argv[1]); eps=float(sys.argv[2]); dil=int(sys.argv[3])
    t0=time.time(); g,v=trace(P,thr,eps=eps,dil=dil)
    n=sum(len(r) for gg in g for r in gg)
    c=raster(g,v); print('thr',thr,'pts',n,'groups',len(g),'err sharp/b6/b1.5 %.2f %.2f %.2f'%score(c,P,54.2),'t %.1f'%(time.time()-t0))
    cv2.imwrite('vec3.png',(forward(c,54.2)*255).astype(np.uint8))
