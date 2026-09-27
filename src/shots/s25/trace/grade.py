# numpy port of src/lib/post.js (no grain). grade(P, t) with P float RGB 0..1 (H,W,3) -> graded 0..1
import numpy as np, cv2
def _blur_q(img, sigma):
    # separable gaussian truncated at 3 sigma (as the shader), replicate edges
    k=int(np.floor(sigma*3)); x=np.arange(-k,k+1); w=np.exp(-0.5*x*x/sigma/sigma); w/=w.sum()
    return cv2.sepFilter2D(img, -1, w.astype(np.float32), w.astype(np.float32), borderType=cv2.BORDER_REPLICATE)
def halation(P):
    H,W=P.shape[:2]; qw,qh=round(W/4),round(H/4)
    # hi pass sampled at quarter res centres, 4x4 box average around each (approx INTER_AREA)
    s=cv2.resize(P,(qw,qh),interpolation=cv2.INTER_AREA)
    hl=np.clip((s-120/255)/(135/255),0,1)*s
    b5=_blur_q(hl.astype(np.float32),5); b16=_blur_q(hl.astype(np.float32),16)
    hb=0.6*b5+0.4*b16
    return cv2.resize(hb,(W,H),interpolation=cv2.INTER_LINEAR)
def vign(H,W):
    y,x=np.mgrid[0:H,0:W].astype(np.float32)
    qx=((x+0.5)/W-0.5)*2; qy=((y+0.5)/H-0.5)*2
    r=np.clip((qx*qx+qy*qy)/2,0,1)
    return 1-0.38*r**1.15
def flick(t): return 1+0.018*np.sin(t*2*np.pi*0.9)+0.012*np.sin(t*2*np.pi*2.3+1.0)
def grade(P,t,halo=0.5,hb=None):
    H,W=P.shape[:2]
    if hb is None: hb=halation(P)
    f=1-(1-P)*(1-halo*hb)
    f=f*0.65+0.35*(f*f*(3-2*f))
    f=f*vign(H,W)[...,None]*flick(t)
    return np.clip(f,0,1)
def ungrade(S,t,iters=12,halo=0.5):
    # fixed-point inverse: find P with grade(P)=S
    P=S.copy()
    for i in range(iters):
        G=grade(P,t,halo)
        P=np.clip(P+(S-G)*0.9,0,1)
    return P
