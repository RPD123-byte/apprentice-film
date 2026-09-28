import numpy as np, cv2, math
from grade import hb_map, S, flick
W,H=2206,946
raw=cv2.imread('raw/r-140.160.png')[:,:,::-1].astype(np.float32)/255
yy,xx=np.mgrid[0:H,0:W]; u=(xx+0.5)/W; v=1-(yy+0.5)/H; qx=(u-0.5)*2; qy=(v-0.5)*2
vig=1-0.38*np.minimum(1,(qx*qx+qy*qy)/2)**1.15
def fwd(img,t):
    hb=hb_map(img); h=1-(1-img)*(1-0.5*hb); return S(h)*vig[...,None]*flick(t)
sky=(slice(20,150),slice(800,1300))
m=np.ones((H,W),bool); m[150:480,1440:1720]=False
ref=fwd(raw,140.16)
for k in [1,0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.2,0.1,0.05]:
    g=fwd(raw*k,140.16)
    a=(g[m]*ref[m]).sum()/(ref[m]**2).sum()
    r=g[sky].reshape(-1,3).mean(0)/ref[sky].reshape(-1,3).mean(0)
    print(f'k {k:.2f} alpha {a:.3f} sky ratios R {r[0]:.3f} G {r[1]:.3f} B {r[2]:.3f}  sky {np.round(g[sky].reshape(-1,3).mean(0)*255)}')
