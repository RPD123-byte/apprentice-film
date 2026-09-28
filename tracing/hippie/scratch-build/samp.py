# sample source colours (median in a small box) and invert vignette + S-curve -> pre-grade hex
import cv2, numpy as np, sys
img=cv2.imread(sys.argv[1]).astype(np.float32)/255.0
H,W=img.shape[:2]
lut_x=np.linspace(0,1,4096); lut_y=lut_x*0.65+0.35*(lut_x*lut_x*(3-2*lut_x))
def inv(v): return np.interp(v,lut_y,lut_x)
for arg in sys.argv[2:]:
    name,xy=arg.split('=') if '=' in arg else (arg,arg)
    x,y=[int(v) for v in xy.split(',')]
    p=img[max(0,y-3):y+4,max(0,x-3):x+4].reshape(-1,3)
    m=np.median(p,axis=0)[::-1]
    qx=(x/W-0.5)*2; qy=(y/H-0.5)*2; r=min(1,(qx*qx+qy*qy)/2); v=1-0.38*r**1.15
    pre=inv(np.clip(m/v,0,1))
    h=lambda c:'#'+''.join('%02x'%int(round(min(1,max(0,t))*255)) for t in c)
    print(f"{name:14s} src {h(m)}  pre {h(pre)}")
