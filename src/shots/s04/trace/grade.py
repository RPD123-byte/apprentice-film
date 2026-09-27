# Python port of src/lib/post.js (no grain) + its inverse, for measuring in pre-grade ("paint") space.
import cv2, numpy as np
W,H=2206,946
def _vig():
    ys,xs=np.mgrid[0:H,0:W].astype(np.float32)
    u=(xs+0.5)/W; v=(ys+0.5)/H
    qx=(u-0.5)*2; qy=(v-0.5)*2
    r=np.clip((qx*qx+qy*qy)/2,0,1)
    return 1-0.38*r**1.15
VIG=_vig()
def flick(t): return 1+0.018*np.sin(t*2*np.pi*0.9)+0.012*np.sin(t*2*np.pi*2.3+1.0)
def halo_map(p):  # p in 0..1 float (H,W)
    qw,qh=round(W/4),round(H/4)
    s=cv2.resize(p,(qw,qh),interpolation=cv2.INTER_AREA)
    hl=np.clip((s-120/255)/(135/255),0,1)*s
    def bl(a,sg):
        k=int(sg*3)
        return cv2.GaussianBlur(a,(2*k+1,2*k+1),sg,borderType=cv2.BORDER_REPLICATE)
    hb=0.6*bl(hl,5)+0.4*bl(hl,16)
    return cv2.resize(hb,(W,H),interpolation=cv2.INTER_LINEAR)
def scurve(f): return f*0.65+0.35*(f*f*(3-2*f))
_X=np.linspace(0,1,4097); _Y=scurve(_X)
def iscurve(y): return np.interp(y,_Y,_X)
def grade(P,t,halo=0.5):
    p=P.astype(np.float32)/255
    hb=halo_map(p)
    f=1-(1-p)*(1-halo*hb)
    f=scurve(f)*VIG*flick(t)
    return np.clip(f*255,0,255)
def degrade(F,t,halo=0.5,it=3):
    f=np.clip(F.astype(np.float32)/255/(VIG*flick(t)),0,1)
    f=iscurve(f).astype(np.float32)
    p=f.copy()
    for _ in range(it):
        hb=halo_map(p)
        p=np.clip(1-(1-f)/(1-halo*hb),0,1).astype(np.float32)
    return p*255
if __name__=='__main__':
    import sys
    F=cv2.imread(sys.argv[1],0).astype(np.float32)
    P=degrade(F,22.08); G=grade(P,22.08)
    print('roundtrip MAE',np.abs(G-F).mean(), 'P mean',P.mean(),'F mean',F.mean())
