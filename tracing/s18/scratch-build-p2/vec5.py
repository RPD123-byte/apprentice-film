# stacked outline traces: for each threshold, ink shapes with holes and a measured value (flat or ramp) per shape.
# Shape value at level k = mean of P over the shape minus the next level's region (what stays visible), so the stack
# reproduces the band means.
import numpy as np, cv2, sys, time
sys.path.insert(0,'.')
from grade import *
from vec4 import raster as raster1
def shapes(P, thr, up=4, eps=0.45, minarea=1.0, mask=None):
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
        if not out or abs(cv2.contourArea(out[0]))<minarea: continue
        groups.append(out)
    return groups
def cover(g,x0,y0,w,h,ss=4):
    m=np.zeros((h*ss,w*ss),np.uint8)
    cv2.fillPoly(m,[np.round(((r-[x0,y0]+0.5)*ss-0.5)*16).astype(np.int32) for r in g],255,shift=4)
    return cv2.resize(m,(w,h),interpolation=cv2.INTER_AREA).astype(np.float32)/255
def build(P, levels, eps=0.45, bigA=400, mask=None, dil_first=1):
    Hh,Ww=P.shape; layers=[]
    covs=[]
    for k,l in enumerate(levels):
        gs=shapes(P,l,eps=eps,mask=mask); layers.append(gs)
    # coverage of the next level (to exclude from the value fit)
    nextcov=[]
    for k in range(len(levels)):
        if k+1<len(levels):
            allr=[r for g in layers[k+1] for r in g]
            nextcov.append(cover(allr,0,0,Ww,Hh) if allr else np.zeros((Hh,Ww),np.float32))
        else: nextcov.append(np.zeros((Hh,Ww),np.float32))
    out=[]
    for k,gs in enumerate(layers):
        vals=[]
        for g in gs:
            x0,y0=np.floor(g[0].min(0)).astype(int)-3; x1,y1=np.ceil(g[0].max(0)).astype(int)+4
            x0=max(x0,0); y0=max(y0,0); x1=min(x1,Ww); y1=min(y1,Hh)
            c=cover(g,x0,y0,x1-x0,y1-y0)
            vis=c*(1-nextcov[k][y0:y1,x0:x1])
            sub=P[y0:y1,x0:x1]
            A=vis.sum()
            if A<0.3: vals.append((levels[k],0.,0.)); continue
            # skirt mass (pixels just outside every level-0 shape) goes to the first level
            if k==0 and dil_first>0:
                ring=np.clip(cv2.dilate(c,np.ones((3,3),np.float32))-c,0,1)
                extra=float((sub*ring).sum())
            else: extra=0.0
            mass=float((sub*vis).sum())+extra
            if A>=bigA:
                ys,xs=np.nonzero(vis>0.5); vv=sub[ys,xs]; kk=mass/max(float((sub*vis).sum()),1e-6)
                M=np.c_[np.ones_like(xs),xs+x0,ys+y0].astype(np.float64)
                co,*_=np.linalg.lstsq(M,vv*kk,rcond=None); vals.append(tuple(float(x) for x in co))
            else: vals.append((min(1.0,mass/A),0.,0.))
        out.append((gs,vals))
    return out
def raster(layers,H=H,W=W):
    canvas=np.zeros((H,W),np.float32)
    for gs,vals in layers: canvas=raster1(gs,vals,canvas=canvas)
    return canvas
def score(canvas,P,t):
    F=forward(canvas,t); G=forward(P,t)
    return (np.abs(canvas-P).mean()*255, np.abs(cv2.GaussianBlur(F,(0,0),6)-cv2.GaussianBlur(G,(0,0),6)).mean()*255,
            np.abs(cv2.GaussianBlur(F,(0,0),1.5)-cv2.GaussianBlur(G,(0,0),1.5)).mean()*255, (cv2.GaussianBlur(F,(0,0),6)-cv2.GaussianBlur(G,(0,0),6)).mean()*255)
if __name__=='__main__':
    P=np.load(sys.argv[3] if len(sys.argv)>3 else 'bgA_P.npy')
    levels=[float(v) for v in sys.argv[1].split(',')]; eps=float(sys.argv[2])
    t0=time.time(); L=build(P,levels,eps=eps)
    n=sum(len(r) for gs,_ in L for g in gs for r in g)
    c=raster(L); print(levels,'pts',n,'groups',[len(gs) for gs,_ in L],'err sharp/b6/b1.5/signed %.2f %.2f %.2f %.2f'%score(c,P,54.2),'t %.1f'%(time.time()-t0))
    cv2.imwrite('vec5.png',(forward(c,54.2)*255).astype(np.uint8)); np.save('vec5.npy',c)
