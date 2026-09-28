# trace one source frame's foreground (everything that is not the page, strip or banner) into a vector cel:
# posterised fills (nested level regions, each one flat colour) + ink strokes (centre lines with widths).
# Measurement only: the output is outlines, centre lines and colours -- no pixels.
import cv2, numpy as np, json, sys
from skimage.filters import apply_hysteresis_threshold
from skel import paths, smooth_simplify
import fgx
LEVELS=[0.15,0.3,0.45,0.58,0.69,0.78,0.85,0.91,0.95]
def contours(m, eps=0.8, minA=5, smooth=0.8):
    m=m.astype(np.uint8)
    if smooth>0:
        m=(cv2.GaussianBlur(m.astype(np.float32),(0,0),smooth)>0.5).astype(np.uint8)
    cs,hier=cv2.findContours(m,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
    out=[]
    if hier is None: return out
    for c,h in zip(cs,hier[0]):
        if abs(cv2.contourArea(c))<minA: continue
        q=c[:,0,:].astype(np.float32)
        if len(q)>6:
            acc=np.zeros_like(q)
            for o in (-1,0,1): acc+=np.roll(q,o,axis=0)
            q=acc/3
        a=cv2.approxPolyDP(q.reshape(-1,1,2),eps,True)[:,0,:]
        if len(a)<3: continue
        out.append(np.round(a*2).astype(int))   # half-pixel units
    return out
def trace(F, m, levels=LEVELS, ink=False, heal=1, ink_hi=0.12, ink_lo=0.055, eps=0.8, smooth=0.8):
    ys,xs=np.nonzero(m)
    if len(xs)==0: return None
    x0,y0=max(0,xs.min()-4),max(0,ys.min()-4); x1,y1=min(F.shape[1],xs.max()+5),min(F.shape[0],ys.max()+5)
    Fc=F[y0:y1,x0:x1]; mc=m[y0:y1,x0:x1]
    Y=(Fc[...,2]*0.299+Fc[...,1]*0.587+Fc[...,0]*0.114).astype(np.float32)
    se=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(heal,heal))
    Yc=cv2.morphologyEx(Y,cv2.MORPH_CLOSE,se) if heal>1 else Y.copy()
    bh=(Yc-Y)
    inner=cv2.erode(mc,np.ones((3,3),np.uint8))
    strokes=[]; inkm=np.zeros(mc.shape,np.uint8)
    if ink:
        bhs=cv2.GaussianBlur(bh,(0,0),0.6)*inner
        im=apply_hysteresis_threshold(bhs,ink_lo,ink_hi).astype(np.uint8)
        n,cc,st,_=cv2.connectedComponentsWithStats(im,connectivity=8)
        for i in range(1,n):
            if st[i,4]<8: im[cc==i]=0
        inkm=im
        dt=cv2.distanceTransform(im,cv2.DIST_L2,5)
        for a,w in paths(im,dt,4):
            vals=[Y[int(round(p[1])),int(round(p[0]))] for p in a]
            a2,w2=smooth_simplify(a,w,1,0.45)
            if len(a2)<2: continue
            # stroke value: the darkest along the centre (median), width: 2*dt (ink mask half-width)
            v=float(np.median(vals))
            strokes.append({'v':round(v,3),'p':[round(float(t)+o,1) for q in a2 for t,o in zip(q,(x0,y0))],'w':[round(float(max(0.6,2*x)),1) for x in w2]})
    # fills: nested level regions on the healed luminance
    fills=[]
    clean=(inkm==0)&(inner>0)
    for i in range(len(levels)+1):
        reg=mc>0 if i==0 else (mc>0)&(Yc>=levels[i-1])
        if reg.sum()<5: break
        band=reg&((Yc<levels[i]) if i<len(levels) else True)
        sel=band&clean
        if sel.sum()<3: sel=band
        if sel.sum()<1: sel=reg
        col=np.median(Fc[sel],axis=0)[::-1]   # rgb
        rings=contours(reg.astype(np.uint8),eps=eps,smooth=smooth)
        if not rings: continue
        fills.append({'c':[int(round(v*255)) for v in np.clip(col,0,1)],'r':[(r+[2*x0,2*y0]).ravel().tolist() for r in rings]})
    return {'bbox':[int(x0),int(y0),int(x1),int(y1)],'fills':fills,'strokes':strokes}
def raster(cel, shape, base, S=2, feather=0.6):
    """python preview: draw the cel over base (float bgr 0..1); fills blurred by `feather` px"""
    out=base.copy()
    if cel is None: return out
    x0,y0,x1,y1=cel['bbox']
    w,h=x1-x0,y1-y0
    big=np.zeros((h*S,w*S,3),np.float32); A=np.zeros((h*S,w*S),np.float32)
    for f in cel['fills']:
        m=np.zeros((h*S,w*S),np.uint8)
        pts=[((np.array(r).reshape(-1,2)/2-[x0,y0])*S*16).astype(np.int32) for r in f['r']]
        cv2.fillPoly(m,pts,1,lineType=cv2.LINE_8,shift=4)
        c=np.array(f['c'][::-1],np.float32)/255
        big[m>0]=c; A[m>0]=1
    big=big*A[...,None]
    if feather>0:
        big=cv2.GaussianBlur(big,(0,0),feather*S); A=cv2.GaussianBlur(A,(0,0),feather*S)
    for s in cel.get('strokes',[]):
        p=(np.array(s['p']).reshape(-1,2)-[x0,y0])*S; ww=np.array(s['w'])*S
        c=(s['v'],)*3
        lm=np.zeros(A.shape,np.float32)
        for j in range(len(p)-1):
            cv2.line(lm,tuple(np.int32(p[j]*16)),tuple(np.int32(p[j+1]*16)),1.0,max(1,int(round((ww[j]+ww[j+1])/2))),lineType=cv2.LINE_AA,shift=4)
        big=big*(1-lm[...,None])+np.float32(c)*lm[...,None]; A=np.maximum(A,lm)
    big=cv2.resize(big,(w,h),interpolation=cv2.INTER_AREA); A=cv2.resize(A,(w,h),interpolation=cv2.INTER_AREA)
    reg=out[y0:y1,x0:x1]
    out[y0:y1,x0:x1]=big+reg*(1-A[...,None])
    return out
def run(k, save=True, **kw):
    F=fgx.load(k); P,cov=fgx.predict(k); m,d=fgx.fgmask(F,P,cov,G=fgx.GL[k])
    cel=trace(F,m,**kw)
    if save: json.dump(cel,open('cels/%05d.json'%k,'w'))
    return F,P,m,cel
if __name__=='__main__':
    import os; os.makedirs('cels',exist_ok=True)
    for k in map(int,sys.argv[1].split(',')):
        F,P,m,cel=run(k)
        R=raster(cel,F.shape,P)
        x0,y0,x1,y1=cel['bbox']
        e=np.abs(cv2.GaussianBlur(R,(0,0),2)-cv2.GaussianBlur(F,(0,0),2)).mean(-1)[y0:y1,x0:x1]
        npts=sum(len(r)//2 for f in cel['fills'] for r in f['r'])+sum(len(s['w']) for s in cel['strokes'])
        print(k,'bbox',cel['bbox'],'fills',len(cel['fills']),'strokes',len(cel['strokes']),'points',npts,'bytes',len(json.dumps(cel)),'err2 %.4f'%e[m[y0:y1,x0:x1]>0].mean())
        vis=np.hstack([F[y0:y1,x0:x1],R[y0:y1,x0:x1]])
        cv2.imwrite('prev_%05d.png'%k,np.clip(vis*255,0,255).astype(np.uint8))

# ---------------------------------------------------------------- alpha mode (light and shadow over OUR page)
# For translucent foregrounds (motion streaks, smears): the source frame is modelled as the clean plate lit toward a
# light colour (alpha a_L) or darkened toward black (alpha a_D); both alphas are posterised into nested levels.
ALEV_L=[0.06,0.12,0.19,0.27,0.36,0.46,0.57,0.68,0.79,0.9]
ALEV_D=[0.15,0.32,0.5,0.68,0.85]
def _alpha_levels(Fc,Pc,mc,al,alev,kind,x0,y0,eps,smooth):
    out=[]; prev=0.0
    for i,t in enumerate(alev):
        reg=mc&(al>=t)
        if reg.sum()<8: break
        nxt=alev[i+1] if i+1<len(alev) else 1.01
        band=reg&(al<nxt)
        target=float(np.median(al[band])) if band.sum()>5 else min(1,(t+nxt)/2)
        sel=band&(al>0.08)
        if kind=='L' and sel.sum()>5:
            A=al[sel][:,None]; col=np.median((Fc[sel]-(1-A)*Pc[sel])/A,axis=0)[::-1]
        elif kind=='D' and sel.sum()>5:
            A=al[sel][:,None]; col=np.median((Fc[sel]-(1-A)*Pc[sel])/A,axis=0)[::-1]
        else: col=np.array([0.94,0.94,0.94]) if kind=='L' else np.array([0.01,0.01,0.01])
        col=np.clip(col,0,1)
        inc=(target-prev)/(1-prev) if prev<0.999 else 0
        prev=target
        rings=contours(reg.astype(np.uint8),eps=eps,smooth=smooth)
        if not rings: continue
        out.append({'c':[int(round(v*255)) for v in col],'a':round(float(np.clip(inc,0,1)),3),'r':[(r+[2*x0,2*y0]).ravel().tolist() for r in rings]})
    return out
def trace_alpha(F, P, m, eps=0.9, smooth=0.9, Wt=0.96, dark=False):
    ys,xs=np.nonzero(m)
    if len(xs)==0: return None
    x0,y0=max(0,xs.min()-4),max(0,ys.min()-4); x1,y1=min(F.shape[1],xs.max()+5),min(F.shape[0],ys.max()+5)
    Fc=F[y0:y1,x0:x1]; Pc=P[y0:y1,x0:x1]; mc=m[y0:y1,x0:x1]>0
    Yf=Fc.mean(-1); Yp=Pc.mean(-1)
    aL=np.where(Yf>Yp,np.clip((Yf-Yp)/np.maximum(Wt-Yp,0.04),0,1),0)
    aD=np.where(Yf<Yp-0.03,np.clip((Yp-Yf)/np.maximum(Yp-0.02,0.04),0,1),0)
    fills=(_alpha_levels(Fc,Pc,mc,aD,ALEV_D,'D',x0,y0,eps,smooth) if dark else [])+_alpha_levels(Fc,Pc,mc,aL,ALEV_L,'L',x0,y0,eps,smooth)
    return {'bbox':[int(x0),int(y0),int(x1),int(y1)],'fills':fills,'strokes':[]}

def raster_any(cel, base, S=2):
    """preview of opaque or alpha cels over base (float bgr 0..1): each level composited in order"""
    out=base.copy()
    if cel is None: return out
    x0,y0,x1,y1=cel['bbox']; w,h=x1-x0,y1-y0
    reg=out[y0:y1,x0:x1]
    for f in cel['fills']:
        m=np.zeros((h*S,w*S),np.uint8)
        pts=[((np.array(r).reshape(-1,2)/2-[x0,y0])*S*16).astype(np.int32) for r in f['r']]
        cv2.fillPoly(m,pts,255,lineType=cv2.LINE_8,shift=4)
        cov=cv2.resize(m.astype(np.float32)/255,(w,h),interpolation=cv2.INTER_AREA)*f.get('a',1.0)
        c=np.array(f['c'][::-1],np.float32)/255
        reg[:]=reg*(1-cov[...,None])+c*cov[...,None]
    for s in cel.get('lines',[]):
        p=(np.array(s['p']).reshape(-1,2)-[x0,y0]); ww=np.array(s['w'])
        lm=np.zeros((h,w),np.float32)
        for j in range(len(p)-1):
            cv2.line(lm,tuple(np.int32(p[j]*16)),tuple(np.int32(p[j+1]*16)),1.0,max(1,int(round((ww[j]+ww[j+1])/2))),lineType=cv2.LINE_AA,shift=4)
        c=np.array(s['c'][::-1],np.float32)/255
        reg[:]=reg*(1-lm[...,None])+c*lm[...,None]
    return out
