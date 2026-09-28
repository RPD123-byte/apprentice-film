# Vector trace of one owl drawing (pre-grade grey image, 0..1): silhouette rings, a quadratic base-value field,
# and nested tone regions below the base (each a set of even-odd rings with one fill value). Control points only.
import cv2, numpy as np, json
UP=4
def rings_of(mask, eps, mina, x0=0, y0=0):
    # mask at UP x resolution -> rings in 1x coords (outer + holes, even-odd)
    cs,hier=cv2.findContours(mask.astype(np.uint8),cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
    out=[]
    for c in cs:
        if abs(cv2.contourArea(c))<mina*UP*UP: continue
        a=cv2.approxPolyDP(c,eps*UP,True)[:,0,:].astype(np.float32)
        if len(a)<3: continue
        a=(a+0.5)/UP-0.5
        out.append([[round(float(p[0])+x0,2),round(float(p[1])+y0,2)] for p in a])
    return out
def up(img): return cv2.resize(img,None,fx=UP,fy=UP,interpolation=cv2.INTER_CUBIC)
def trace(v, sil_mask_fn, deltas=(0.07,0.16,0.28,0.42,0.58,0.74), eps=0.35, mina=1.5, base_thr=0.8, sil_blur=0.6, lvl_blur=0.5):
    H,W=v.shape
    vu=up(cv2.GaussianBlur(v,(0,0),sil_blur))
    silu=sil_mask_fn(vu)
    silu=cv2.morphologyEx(silu.astype(np.uint8),cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    sil=rings_of(silu,eps,mina)
    sil1=cv2.resize(silu.astype(np.float32),(W,H),interpolation=cv2.INTER_AREA)>0.5
    # base: quadratic fit to the bright plumage pixels
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
    m=sil1&(v>base_thr)
    m=cv2.erode(m.astype(np.uint8),np.ones((3,3),np.uint8))>0
    X=np.stack([np.ones_like(xx),xx/W,yy/H,(xx/W)**2,(xx/W)*(yy/H),(yy/H)**2],-1)
    coef=np.linalg.lstsq(X[m],v[m],rcond=None)[0]
    base=np.clip(X@coef,0,1)
    d=np.clip(base-v,0,1)
    du=up(cv2.GaussianBlur(d,(0,0),lvl_blur))
    lv=[]
    bands=list(deltas)+[9]
    for k,dl in enumerate(deltas):
        mk=((du>dl)&(silu>0)).astype(np.uint8)
        band=(d>=dl)&(d<bands[k+1])&sil1
        n,lab=cv2.connectedComponents(mk)
        for i in range(1,n):
            ci=(lab==i)
            if ci.sum()<mina*UP*UP: continue
            c1=cv2.resize(ci.astype(np.float32),(W,H),interpolation=cv2.INTER_AREA)>0.5
            sel=c1&band
            if sel.sum()>=3: val=float(np.median(v[sel]))
            elif c1.sum()>=1: val=float(np.median(v[c1]))
            else: continue
            r=rings_of(ci,eps,mina)
            if r: lv.append({"v":round(val,3),"rings":r})
    return {"w":W,"h":H,"sil":sil,"base":[round(float(c),4) for c in coef],"levels":lv}
def render(T, blur=0.7, supers=4, bg=None):
    W,H=T["w"],T["h"]; s=supers
    def fill(img,rings,val):
        pts=[np.round((np.array(r)+0.5)*s-0.5).astype(np.int32) for r in rings]
        m=np.zeros(img.shape,np.uint8); 
        # even-odd: xor each ring
        for p in pts:
            t=np.zeros_like(m); cv2.fillPoly(t,[p],1); m^=t
        img[m>0]=val
        return m
    yy,xx=np.mgrid[0:H*s,0:W*s].astype(np.float32); xx=(xx+0.5)/s-0.5; yy=(yy+0.5)/s-0.5
    c=T["base"]; base=np.clip(c[0]+c[1]*xx/W+c[2]*yy/H+c[3]*(xx/W)**2+c[4]*(xx/W)*(yy/H)+c[5]*(yy/H)**2,0,1)
    img=np.zeros((H*s,W*s),np.float32); a=np.zeros_like(img)
    m=fill(a,T["sil"],1.0)
    img=base*a
    for L in T["levels"]:
        t=np.zeros_like(img); mm=fill(t,L["rings"],1.0)
        img=np.where(mm>0,L["v"],img)
    img=cv2.resize(img,(W,H),interpolation=cv2.INTER_AREA); a=cv2.resize(a,(W,H),interpolation=cv2.INTER_AREA)
    if blur>0: img=cv2.GaussianBlur(img,(0,0),blur); a=cv2.GaussianBlur(a,(0,0),blur)
    return img,a
