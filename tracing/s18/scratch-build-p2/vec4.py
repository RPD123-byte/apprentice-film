# single-threshold outline trace with holes; per ink shape a measured linear value ramp (plane fit)
import numpy as np, cv2, sys, time
sys.path.insert(0,'.')
from grade import *
def trace(P, thr=0.4, up=4, eps=0.45, minarea=1.0, dil=1, mask=None, plane=True, bigA=400):
    Hh,Ww=P.shape
    U=cv2.resize(P,(Ww*up,Hh*up),interpolation=cv2.INTER_CUBIC)
    BU=(U>thr).astype(np.uint8)
    if mask is not None: BU&=cv2.resize(mask,(Ww*up,Hh*up),interpolation=cv2.INTER_NEAREST)
    cs,hier=cv2.findContours(BU,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
    hier=hier[0] if hier is not None else []
    groups=[]
    for i,c in enumerate(cs):
        if hier[i][3]!=-1: continue
        rings=[c]; j=hier[i][2]
        while j!=-1: rings.append(cs[j]); j=hier[j][0]
        out=[]
        for r in rings:
            a=cv2.approxPolyDP(r,eps*up,True).reshape(-1,2).astype(np.float32)
            if len(a)<3: continue
            out.append((a+0.5)/up-0.5)
        if not out: continue
        if abs(cv2.contourArea(out[0]))<minarea: continue
        groups.append(out)
    vals=[]
    for g in groups:
        x0,y0=np.floor(g[0].min(0)).astype(int)-3; x1,y1=np.ceil(g[0].max(0)).astype(int)+4
        x0=max(x0,0); y0=max(y0,0); x1=min(x1,Ww); y1=min(y1,Hh)
        m=np.zeros((y1-y0,x1-x0),np.uint8)
        cv2.fillPoly(m,[np.round((r-[x0,y0])*16).astype(np.int32) for r in g],1,shift=4)
        A=m.sum()
        if A==0: vals.append((thr,0,0)); continue
        md=cv2.dilate(m,np.ones((2*dil+1,2*dil+1),np.uint8)) if dil>0 else m
        sub=P[y0:y1,x0:x1]
        mass=float((sub*md).sum()); v=min(1.0,mass/A)
        if plane and A>=bigA:
            ys,xs=np.nonzero(m); vv=sub[ys,xs]
            # mass boost so the plane integrates to the dilated mass
            k=mass/max(vv.sum(),1e-6)
            M=np.c_[np.ones_like(xs),xs+x0,ys+y0].astype(np.float64)
            co,*_=np.linalg.lstsq(M,vv*k,rcond=None)
            vals.append(tuple(co))
        else: vals.append((v,0.0,0.0))
    return groups,vals
def raster(groups,vals,H=H,W=W,ss=4,bg=0.0,canvas=None):
    if canvas is None: canvas=np.full((H,W),bg,np.float32)
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
    flat=[(g,v[0]) for g,v in zip(groups,vals) if v[1]==0 and v[2]==0]
    ramp=[(g,v) for g,v in zip(groups,vals) if not(v[1]==0 and v[2]==0)]
    q={}
    for g,v in flat: q.setdefault(round(v*48)/48,[]).extend(g)
    for v,rs in q.items():
        m=np.zeros((H*ss,W*ss),np.uint8)
        cv2.fillPoly(m,[np.round(((r+0.5)*ss-0.5)*16).astype(np.int32) for r in rs],255,shift=4)
        cov=cv2.resize(m,(W,H),interpolation=cv2.INTER_AREA).astype(np.float32)/255
        canvas=canvas*(1-cov)+v*cov
    for g,(a,b,c) in ramp:
        x0,y0=np.floor(g[0].min(0)).astype(int)-2; x1,y1=np.ceil(g[0].max(0)).astype(int)+3
        x0=max(x0,0); y0=max(y0,0); x1=min(x1,W); y1=min(y1,H)
        m=np.zeros(((y1-y0)*ss,(x1-x0)*ss),np.uint8)
        cv2.fillPoly(m,[np.round(((r-[x0,y0]+0.5)*ss-0.5)*16).astype(np.int32) for r in g],255,shift=4)
        cov=cv2.resize(m,(x1-x0,y1-y0),interpolation=cv2.INTER_AREA).astype(np.float32)/255
        val=np.clip(a+b*xx[y0:y1,x0:x1]+c*yy[y0:y1,x0:x1],0,1)
        canvas[y0:y1,x0:x1]=canvas[y0:y1,x0:x1]*(1-cov)+val*cov
    return canvas
def score(canvas,P,t):
    F=forward(canvas,t); G=forward(P,t)
    return (np.abs(canvas-P).mean()*255, np.abs(cv2.GaussianBlur(F,(0,0),6)-cv2.GaussianBlur(G,(0,0),6)).mean()*255,
            np.abs(cv2.GaussianBlur(F,(0,0),1.5)-cv2.GaussianBlur(G,(0,0),1.5)).mean()*255)
if __name__=='__main__':
    P=np.load(sys.argv[5] if len(sys.argv)>5 else 'bgA_P.npy')
    thr=float(sys.argv[1]); eps=float(sys.argv[2]); dil=int(sys.argv[3]); bigA=int(sys.argv[4])
    t0=time.time(); g,v=trace(P,thr,eps=eps,dil=dil,bigA=bigA)
    n=sum(len(r) for gg in g for r in gg)
    c=raster(g,v); print('thr',thr,'pts',n,'groups',len(g),'ramps',sum(1 for x in v if x[1] or x[2]),'err sharp/b6/b1.5 %.2f %.2f %.2f'%score(c,P,54.2),'t %.1f'%(time.time()-t0))
    cv2.imwrite('vec4.png',(forward(c,54.2)*255).astype(np.uint8)); np.save('vec4.npy',c)
