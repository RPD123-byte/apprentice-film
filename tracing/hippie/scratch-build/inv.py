# pre-grade colour estimate for flat areas: invert halation(flat) + S-curve + vignette. usage: inv.py img x,y[,r] ...
import cv2, numpy as np, sys
img=cv2.imread(sys.argv[1]).astype(np.float32)/255.0; H,W=img.shape[:2]
def fwd(p,v,hbscale=1.0):
    hl=np.clip((p-120/255)/(135/255),0,1)*p*hbscale
    f=1-(1-p)*(1-0.5*hl)
    f=f*0.65+0.35*(f*f*(3-2*f))
    return f*v
def inv(t,v,hbscale):
    lo=np.zeros(3); hi=np.ones(3)
    for _ in range(40):
        mid=(lo+hi)/2; m=fwd(mid,v,hbscale); lo=np.where(m<t,mid,lo); hi=np.where(m<t,hi,mid)
    return (lo+hi)/2
hx=lambda c:'#'+''.join('%02x'%int(round(min(1,max(0,t))*255)) for t in c)
for a in sys.argv[2:]:
    name,xy=a.split('=') if '=' in a else (a,a)
    v=[int(t) for t in xy.split(',')]; x,y=v[0],v[1]; r=v[2] if len(v)>2 else 3
    m=np.median(img[y-r:y+r+1,x-r:x+r+1].reshape(-1,3),axis=0)[::-1]
    qx=(x/W-0.5)*2; qy=(y/H-0.5)*2; rr=min(1,(qx*qx+qy*qy)/2); vig=1-0.38*rr**1.15
    print(f"{name:12s} src {hx(m)} pre(flat) {hx(inv(m,vig,1.0))} pre(nohalo) {hx(inv(m,vig,0.0))}")
