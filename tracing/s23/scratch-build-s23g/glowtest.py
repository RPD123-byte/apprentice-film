import fgx, numpy as np, cv2
from scipy.special import erf
W,H=2206,946
x0,y0,x1,y1=137,121.5,2030,946
xx=np.arange(W)+0.5; yy=np.arange(H)+0.5
Phi=lambda x:0.5*(1+erf(x/np.sqrt(2)))
fx=Phi((xx-x0)/10)-Phi((xx-x1)/10); fy=Phi((yy-y0)/10)-Phi((yy-(y1+60))/10)
OUT=(1-fy[:,None]*fx[None,:]).astype(np.float32)
def glow(C):
    s=cv2.resize(C,(W//8,H//8),interpolation=cv2.INTER_AREA)
    a=cv2.GaussianBlur(s,(0,0),7); b=cv2.GaussianBlur(s,(0,0),26)
    g=np.minimum(120/255,(0.6*a+0.4*b)*4.5)
    return cv2.resize(g,(W,H),interpolation=cv2.INTER_LINEAR)*OUT[...,None]
if __name__=='__main__':
    import sys
    k=int(sys.argv[1])
    F=fgx.load(k); P,cov=fgx.predict(k)
    ins=np.zeros((H,W),np.float32); ins[int(y0):,int(x0):int(x1)]=1
    # content: the source frame itself inside the screen, the predicted layer outside (plate room = glow only -> black)
    C=F*ins[...,None] + (P*cov[...,None])*(1-ins[...,None])
    Gin=glow(F*ins[...,None]); Gall=glow(C)
    for (x,y) in [(1053,43),(1300,100),(1100,60),(1500,30),(1700,90)]:
        print((x,y),'F',F[y,x].mean().round(3),'P(strip)',P[y,x].mean().round(3),'cov',cov[y,x].round(2),'Gin',Gin[y,x].mean().round(3),'Gall',Gall[y,x].mean().round(3), 'pred=Pcont+Gall', (P[y,x]*cov[y,x]+Gall[y,x]).mean().round(3))
