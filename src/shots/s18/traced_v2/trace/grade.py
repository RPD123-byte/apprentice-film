# Python model of src/lib/post.js (forward) and its inverse (source frame -> pre-grade plate value).
import numpy as np, cv2, math
W,H=2206,946; QW,QH=round(W/4+1e-9),int(math.floor(H/4+0.5))
yy,xx=np.mgrid[0:H,0:W]
_q=((xx+0.5)/W-0.5)*2; _r=((yy+0.5)/H-0.5)*2
VIG=(1-0.38*np.clip((_q*_q+_r*_r)/2,0,1)**1.15).astype(np.float32)
def flick(t): return 1+0.018*math.sin(t*2*math.pi*0.9)+0.012*math.sin(t*2*math.pi*2.3+1)
def S(f): return f*0.65+0.35*f*f*(3-2*f)
_lx=np.linspace(0,1,8001); _ly=S(_lx)
def Sinv(v): return np.interp(v,_ly,_lx)
def gblur(a,s):
    k=int(min(48,math.floor(3*s))); x=np.arange(-k,k+1); w=np.exp(-0.5*x*x/(s*s)); w/=w.sum()
    a=cv2.filter2D(a,-1,w[None,:],borderType=cv2.BORDER_REPLICATE); return cv2.filter2D(a,-1,w[:,None],borderType=cv2.BORDER_REPLICATE)
def halo(P):
    s=cv2.resize(P,(QW,QH),interpolation=cv2.INTER_AREA)
    hl=np.clip((s-120/255)/(135/255),0,1)*s
    hb=0.6*gblur(hl,5)+0.4*gblur(hl,16)
    return cv2.resize(hb,(W,H),interpolation=cv2.INTER_LINEAR)
def forward(P,t=54.0,h=0.5):
    f=1-(1-P)*(1-h*halo(P)); f=S(f); f=f*VIG*flick(t); return np.clip(f,0,1)
def inverse(Sg,t=54.0,h=0.5,it=6):
    Sp=Sinv(np.clip(Sg/(VIG*flick(t)),0,1)).astype(np.float32)
    P=Sp.copy()
    for _ in range(it):
        hb=halo(P); P=np.clip(1-(1-Sp)/np.maximum(1-h*hb,1e-3),0,1).astype(np.float32)
    return P
