# Warp a close-up source frame into page units (1600x1000 page), with vignette/S-curve undone, plus grid.
import cv2, numpy as np, re, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cam={}
for l in open('snapshots/s08-ref/cam.txt'):
    m=re.match(r't=\s*([\d.]+) s=([\d.]+) rot=\S+ tx=\s*([-\d.]+) ty=\s*([-\d.]+)',l)
    if m: cam[round(float(m[1]),2)]=tuple(map(float,m.groups()[1:]))
A0=np.array([[0.418768349,-0.00105950832,670.585031],[0.00105950832,0.418768349,106.503905],[0,0,1]])  # frame(t0)->page
def ungrade(f):
    H,W=f.shape[:2]
    y,x=np.mgrid[0:H,0:W]; qx=(x+0.5)/W*2-1; qy=(y+0.5)/H*2-1
    r=np.clip((qx*qx+qy*qy)/2,0,1); v=1-0.38*r**1.15
    g=f.astype(np.float32)/255/v[...,None]
    # invert S-curve g=0.65u+0.35(3u^2-2u^3) by Newton
    u=g.copy()
    for _ in range(8):
        F=0.65*u+0.35*(3*u*u-2*u**3)-g; dF=0.65+0.35*(6*u-6*u*u); u=np.clip(u-F/dF,0,1)
    return (np.clip(u,0,1)*255).astype(np.uint8)
t=float(sys.argv[1]); K=float(sys.argv[2]); x0,y0,x1,y1=map(float,sys.argv[3:7]); out=sys.argv[7]
c=cv2.VideoCapture(V); c.set(1,int(round(t*25))); ok,f=c.read()
f=ungrade(f)
s,tx,ty=cam[round(t,2)]
Ft=np.array([[s,0,tx],[0,s,ty],[0,0,1]])  # frame t0 -> frame t
P2F=Ft@np.linalg.inv(A0)   # page -> frame t
# output pixel (u,v) -> page (x0+u/K, y0+v/K)
O=np.array([[1/K,0,x0],[0,1/K,y0],[0,0,1]])
M=P2F@O
w,h=int((x1-x0)*K),int((y1-y0)*K)
r=cv2.warpPerspective(f,M,(w,h),flags=cv2.INTER_CUBIC|cv2.WARP_INVERSE_MAP)
if len(sys.argv)>8:
    step=int(sys.argv[8])
    for gx in range(int(np.ceil(x0/step))*step,int(x1)+1,step):
        X=int((gx-x0)*K); cv2.line(r,(X,0),(X,h),(0,200,255),1); cv2.putText(r,str(gx),(X+2,12),0,0.4,(0,255,255),1)
    for gy in range(int(np.ceil(y0/step))*step,int(y1)+1,step):
        Y=int((gy-y0)*K); cv2.line(r,(0,Y),(w,Y),(0,200,255),1); cv2.putText(r,str(gy),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,r)
