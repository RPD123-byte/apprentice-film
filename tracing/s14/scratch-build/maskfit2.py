import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(1,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
CT={37.6:(1,0,0),38.6:(1.0271,-51.0,-10.4),38.8:(1.1682,-316.3,-67.3),39.0:(1.3147,-592.8,-127.6),39.2:(1.5352,-1003.1,-220.7),39.4:(1.7483,-1404.6,-293.2),39.6:(1.8697,-1633.7,-337.8),39.72:(1.9404,-1752.3,-369.7),39.8:(2.0159,-1868.1,-396.0),39.88:(2.1564,-2074.9,-475.9),39.96:(2.2148,-2161.2,-506.1)}
S40=(2.2834,-2263.2,-540.3)
ref=grab(40.0); refb=cv2.GaussianBlur(ref,(0,0),14)
yy,xx=np.mgrid[0:946,0:2206]
for t,(s,tx,ty) in CT.items():
    a=s/S40[0]; bx=tx-a*S40[1]; by=ty-a*S40[2]
    M=np.float32([[a,0,bx],[0,a,by]])
    w=cv2.warpAffine(refb,M,(2206,946),borderValue=0)
    src=cv2.GaussianBlur(grab(t),(0,0),14)
    valid=(w>25)
    r=np.where(valid,src/np.maximum(w,1),0)
    # exclude owl: owl region bright in src and not in w; drop ratio>1.3
    valid&=(r<1.25)
    # also exclude the corridor dark middle (w small) handled by w>25
    rv=r[valid]
    g=np.percentile(rv,97)
    m=valid&(r>0.5*g)
    ys,xs=np.nonzero(m)
    # fit ellipse via moments of region
    cx,cy=xs.mean(),ys.mean()
    sx,sy=xs.std(),ys.std()
    print(f't={t:6.2f} gain(97%)={g:.2f} halfmax region: cx={cx:.0f} cy={cy:.0f} x[{xs.min()}-{xs.max()}] y[{ys.min()}-{ys.max()}] std=({sx:.0f},{sy:.0f})  room-scale a={a:.3f} off=({bx:.0f},{by:.0f})')
