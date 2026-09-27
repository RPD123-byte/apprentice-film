# Python model of src/lib/post.js (the film grade) + its inverse (fixed-point), for measuring in pre-grade units.
import numpy as np, cv2
W,H=2206,946
def _hl(f):
    qw,qh=round(W/4),round(H/4)
    s=cv2.resize(f,(qw,qh),interpolation=cv2.INTER_AREA)
    hl=np.clip((s-120/255)/(135/255),0,1)*s
    b5=cv2.GaussianBlur(hl,(0,0),5,borderType=cv2.BORDER_REPLICATE)
    b16=cv2.GaussianBlur(hl,(0,0),16,borderType=cv2.BORDER_REPLICATE)
    hb=0.6*b5+0.4*b16
    return cv2.resize(hb,(W,H),interpolation=cv2.INTER_LINEAR)
def _vig():
    y,x=np.mgrid[0:H,0:W]
    qx=((x+0.5)/W-0.5)*2; qy=((y+0.5)/H-0.5)*2
    r=np.clip((qx*qx+qy*qy)/2,0,1)
    return (1-0.38*r**1.15)[...,None]
VIG=_vig()
def flick(t): return 1+0.018*np.sin(t*2*np.pi*0.9)+0.012*np.sin(t*2*np.pi*2.3+1)
def grade(f,t,halo=0.5):
    """f: HxWx3 float 0..1 (pre-grade) -> graded (no grain)"""
    hb=_hl(f)
    g=1-(1-f)*(1-halo*hb)
    g=g*0.65+0.35*(g*g*(3-2*g))
    g=g*VIG*flick(t)
    return np.clip(g,0,1)
def _sinv(y):
    # invert y = 0.65x + 0.35 x^2(3-2x) by Newton
    x=y.copy()
    for _ in range(20):
        fx=0.65*x+0.35*x*x*(3-2*x)-y; d=0.65+0.35*6*x*(1-x); x=np.clip(x-fx/d,0,1)
    return x
def ungrade(g,t,halo=0.5,iters=6):
    """graded HxWx3 float -> pre-grade estimate"""
    s=np.clip(g/(VIG*flick(t)),0,1)
    s=_sinv(s)                       # = 1-(1-f)(1-halo hb)
    f=s.copy()
    for _ in range(iters):
        hb=_hl(f)
        f=np.clip(1-(1-s)/np.maximum(1e-3,1-halo*hb),0,1)
    return f
def load(p): return cv2.imread(p).astype(np.float32)/255
