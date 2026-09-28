import cv2, numpy as np, math
import fgx
C,A=fgx.bannerLayer()
def M(p): return fgx.simM(p)
def pts(p):
    Mx=M(p); c=np.array([1084,273,1.0]); return Mx@c
def motion(img, dx, dy, n=15):
    acc=np.zeros_like(img)
    for i in range(n):
        u=(i/(n-1)-0.5)
        Mt=np.float32([[1,0,dx*u],[0,1,dy*u]])
        acc+=cv2.warpAffine(img,Mt,(img.shape[1],img.shape[0]),flags=cv2.INTER_LINEAR)
    return acc/n
for k in [2176,2185,2190,2197,2203]:
    F,P,cov,m=fgx.fg(k)
    p=fgx.hold(fgx.BAN_TRK,k); pp=fgx.hold(fgx.BAN_TRK,k-1); pn=fgx.hold(fgx.BAN_TRK,k+1)
    v=(pts(pn)-pts(pp))/2
    Pl=fgx.plate('H2')
    Cw,Aw=fgx.warpLayer((C,A),M(p))
    q=(Aw>0.99)&(m==0); q&=cv2.erode(q.astype(np.uint8),np.ones((15,15)))>0
    q[:150]=False   # inside the screen only (no glow issues)
    res=[]
    for s in [0,0.25,0.5,0.75,1.0]:
        B=motion(Cw,v[0]*s,v[1]*s) if s>0 else Cw
        e=np.abs(B-F).mean(-1)[q].mean()
        res.append('%.2f:%.4f'%(s,e))
    print(k,'v=(%.1f,%.1f)'%tuple(v),' '.join(res))
print('isotropic')
for k in [2176,2185,2197,2203,2130]:
    F,P,cov,m=fgx.fg(k)
    if k<2160:
        L=fgx.stripLayer(); p=fgx.hold(fgx.STRIP_TRK,k)
    else:
        L=(C,A); p=fgx.hold(fgx.BAN_TRK,k)
    Cw,Aw=fgx.warpLayer(L,M(p))
    q=(Aw>0.99)&(m==0); q&=cv2.erode(q.astype(np.uint8),np.ones((15,15)))>0
    q[:150]=False
    res=[]
    for sg in [0,0.6,1.0,1.5,2.2]:
        B=cv2.GaussianBlur(Cw,(0,0),sg) if sg>0 else Cw
        d=(B-F)[q]
        # best affine tone map too
        a=B.mean(-1)[q]; b=F.mean(-1)[q]; Am=np.vstack([a,np.ones_like(a)]).T; sol=np.linalg.lstsq(Am,b,rcond=None)[0]
        res.append('%.1f:%.4f(fit %.3f,%.3f -> %.4f)'%(sg,np.abs(d).mean(),sol[0],sol[1],np.abs(Am@sol-b).mean()))
    print(k,' '.join(res))
