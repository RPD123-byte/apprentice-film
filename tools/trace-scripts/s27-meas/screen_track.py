# page->frame homography of the laptop screen, tracked frame to frame: warp the page (117.0 s frame) by the previous
# estimate, match SIFT between that warped page (inside the screen quad) and the current frame, refine.
import cv2, numpy as np, sys, json
from common import *
ref=load(117.0,True)
sift=cv2.SIFT_create(6000)
bf=cv2.BFMatcher(cv2.NORM_L2)
t0,t1=float(sys.argv[1]),float(sys.argv[2]); step=0.04 if t1>=t0 else -0.04
# seed with a global match at t0
S=0.4
refs=cv2.resize(ref,None,fx=S,fy=S,interpolation=cv2.INTER_AREA)
kr,dr=sift.detectAndCompute(refs,None)
g=load(t0,True); k,d=sift.detectAndCompute(g,None)
ms=bf.knnMatch(dr,d,k=2); good=[m for m,n in ms if m.distance<0.75*n.distance]
A=np.float32([kr[m.queryIdx].pt for m in good])/S; B=np.float32([k[m.trainIdx].pt for m in good])
H,_=cv2.findHomography(A,B,cv2.RANSAC,3.0); H/=H[2,2]
out={}
n=int(round(abs(t1-t0)/0.04))
for i in range(n+1):
    t=round(t0+i*step,2)
    g=load(t,True)
    for it in range(2):
        w=cv2.warpPerspective(ref,H,(g.shape[1],g.shape[0]),flags=cv2.INTER_AREA)
        m=cv2.warpPerspective(np.full(ref.shape,255,np.uint8),H,(g.shape[1],g.shape[0]))
        m=cv2.erode(m,np.ones((9,9),np.uint8))
        x,y,bw,bh=cv2.boundingRect(m)
        pad=40; X0,Y0=max(0,x-pad),max(0,y-pad); X1,Y1=min(g.shape[1],x+bw+pad),min(g.shape[0],y+bh+pad)
        kw,dw=sift.detectAndCompute(w,m)
        mm=np.zeros_like(g); mm[Y0:Y1,X0:X1]=255
        kg,dg=sift.detectAndCompute(g,mm)
        if dw is None or dg is None or len(kw)<8: break
        ms=bf.knnMatch(dw,dg,k=2); good=[a for a,b in ms if a.distance<0.8*b.distance]
        if len(good)<10: break
        A=np.float32([kw[a.queryIdx].pt for a in good]); B=np.float32([kg[a.trainIdx].pt for a in good])
        D,inl=cv2.findHomography(A,B,cv2.RANSAC,2.5)
        if D is None: break
        H=D@H; H/=H[2,2]
    c=cv2.perspectiveTransform(np.float32([[[0,0]],[[2206,0]],[[2206,946]],[[0,946]]]),H).reshape(-1,2)
    out[t]={'H':H.tolist(),'inl':int(inl.sum()),'n':len(good),'corners':c.round(1).tolist()}
    print(f"{t:.2f} inl={int(inl.sum()):4d}/{len(good):4d} "+" ".join(f"({x:.0f},{y:.0f})" for x,y in c),flush=True)
json.dump(out,open(f'screenT_{t0}_{t1}.json','w'))
