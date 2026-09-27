# numpy port of post.js (no grain) for inverse-grading pre-grade colours
import numpy as np, cv2, math
W,H=2206,946
def hb_map(raw):  # raw: float RGB 0..1 (H,W,3) pre-grade paint
    qw,qh=round(W/4),round(H/4)
    s=cv2.resize(raw,(qw,qh),interpolation=cv2.INTER_AREA)
    hl=np.clip((s-120/255)/(135/255),0,1)*s
    def blur(a,sig):
        k=int(sig*3); x=np.arange(-k,k+1); w=np.exp(-0.5*x*x/sig/sig); w/=w.sum()
        a=cv2.filter2D(a,-1,w[None,:],borderType=cv2.BORDER_REPLICATE); return cv2.filter2D(a,-1,w[:,None],borderType=cv2.BORDER_REPLICATE)
    hb=0.6*blur(hl,5)+0.4*blur(hl,16)
    return cv2.resize(hb,(W,H),interpolation=cv2.INTER_LINEAR)
def vig(x,y):
    u=(x+0.5)/W; v=1-(y+0.5)/H; qx=(u-0.5)*2; qy=(v-0.5)*2
    r=min(1,(qx*qx+qy*qy)/2); return 1-0.38*r**1.15
def flick(t): return 1+0.018*math.sin(t*2*math.pi*0.9)+0.012*math.sin(t*2*math.pi*2.3+1)
def S(f): return f*0.65+0.35*f*f*(3-2*f)
def Sinv(g):
    f=np.array(g,float).copy()
    for _ in range(40): f=np.clip(f-(S(f)-g)/(0.65+0.35*6*f*(1-f)),0,1)
    return f
def forward(raw,hb,t,x,y):
    f=raw[y,x]; h=1-(1-f)*(1-0.5*hb[y,x]); return S(h)*vig(x,y)*flick(t)
def inverse(target,hb,t,x,y):
    g=np.array(target)/(vig(x,y)*flick(t)); h=Sinv(np.clip(g,0,1)); return np.clip(1-(1-h)/(1-0.5*hb[y,x]),0,1)
