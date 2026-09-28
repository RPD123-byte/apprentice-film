# numpy port of src/lib/post.js (no grain) and its inverse, for sampling pre-grade colours from the source.
import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
W,H=2206,946
_cap=None
def grab(t):
    global _cap
    if _cap is None: _cap=cv2.VideoCapture(V)
    _cap.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=_cap.read(); return f
def S(f): return 0.65*f+0.35*f*f*(3-2*f)
_lut_x=np.linspace(0,1,4097); _lut_y=S(_lut_x)
def Sinv(v): return np.interp(v,_lut_y,_lut_x)
def vig():
    x=(np.arange(W)+0.5)/W; y=(np.arange(H)+0.5)/H
    qx=(x-0.5)*2; qy=(y-0.5)*2
    r=np.clip((qx[None,:]**2+qy[:,None]**2)/2,0,1)
    return 1-0.38*r**1.15
VIG=vig()
def flick(t): return 1+0.018*np.sin(t*2*np.pi*0.9)+0.012*np.sin(t*2*np.pi*2.3+1.0)
def halo(pre):
    qw,qh=round(W/4),round(H/4)
    s=cv2.resize(pre,(qw,qh),interpolation=cv2.INTER_AREA)
    hl=np.clip((s-120/255)/(135/255),0,1)*s
    b5=cv2.GaussianBlur(hl,(0,0),5); b16=cv2.GaussianBlur(hl,(0,0),16)
    hb=0.6*b5+0.4*b16
    return cv2.resize(hb,(W,H),interpolation=cv2.INTER_LINEAR)
def grade(pre,t,halo_amt=0.5):
    f=1-(1-pre)*(1-halo_amt*halo(pre))
    f=S(f)*VIG[...,None]*flick(t)
    return np.clip(f,0,1)
def ungrade(src,t,iters=5,halo_amt=0.5):
    v=np.clip(src/(VIG[...,None]*flick(t)),0,1)
    fh=Sinv(v); pre=fh.copy()
    for _ in range(iters):
        hb=halo(pre)
        pre=np.clip(1-(1-fh)/(1-halo_amt*hb),0,1)
    return pre
def pre_frame(t,blur=0):
    f=grab(t)[...,::-1].astype(np.float32)/255
    if blur: f=cv2.GaussianBlur(f,(0,0),blur)
    return ungrade(f,t)
def hexc(rgb): return '#%02x%02x%02x'%tuple(int(round(v*255)) for v in rgb)
if __name__=='__main__':
    import sys
    t=float(sys.argv[1]); p=pre_frame(t)
    cv2.imwrite(sys.argv[2],(p[...,::-1]*255).round().astype(np.uint8))
    # roundtrip check
    g=grade(p,t); f=grab(t)[...,::-1].astype(np.float32)/255
    print('roundtrip err',np.abs(g-f).mean()*255)
