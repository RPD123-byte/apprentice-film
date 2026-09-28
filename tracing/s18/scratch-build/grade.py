import numpy as np, cv2, math
W,H=2206,946
yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
qx=((xx+0.5)/W-0.5)*2; qy=((yy+0.5)/H-0.5)*2
rr=np.clip((qx*qx+qy*qy)/2,0,1)
VIG=(1-0.38*rr**1.15)[...,None]
def flick(t): return 1+0.018*math.sin(t*2*math.pi*0.9)+0.012*math.sin(t*2*math.pi*2.3+1.0)
def halo_map(P):
    q=cv2.resize(P,(round(W/4),round(H/4)),interpolation=cv2.INTER_AREA)
    hl=np.clip((q-120/255)/(135/255),0,1)*q
    b5=cv2.GaussianBlur(hl,(0,0),5); b16=cv2.GaussianBlur(hl,(0,0),16)
    hb=0.6*b5+0.4*b16
    return cv2.resize(hb,(W,H),interpolation=cv2.INTER_LINEAR)
def grade(P,t=138.0,halo=0.5):
    f=1-(1-P)*(1-halo*halo_map(P))
    f=f*0.65+0.35*(f*f*(3-2*f))
    f=f*VIG*flick(t)
    return np.clip(f,0,1)
def inv_s(y):
    # invert f*0.65+0.35*smoothstep(f) by Newton
    x=y.copy()
    for _ in range(8):
        g=x*0.65+0.35*x*x*(3-2*x)-y; d=0.65+0.35*6*x*(1-x); x=np.clip(x-g/d,0,1)
    return x
def invert(T,t=138.0,halo=0.5,iters=6):
    # T: post-grade RGB float (no grain). returns pre-grade estimate
    base=np.clip(T/(VIG*flick(t)),0,1)
    s=inv_s(base)  # = screen result
    P=s.copy()
    for _ in range(iters):
        hb=halo*halo_map(P)
        P=np.clip(1-(1-s)/np.clip(1-hb,1e-3,1),0,1)
    return P
def load(path):
    return cv2.cvtColor(cv2.imread(path),cv2.COLOR_BGR2RGB).astype(np.float32)/255
