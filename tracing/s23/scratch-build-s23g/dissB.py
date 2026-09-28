import cv2, numpy as np, math
import fgx
from dissfit import comp, Cs, As, Ps, SC, w2, h2
from scipy.optimize import minimize
C,A=fgx.stripLayer(); P=fgx.plate('H1')
Afit={2139:[1.003,6.768,1142.342,-234.742],2140:[1.003,6.797,1142.465,-235.12],2141:[1.002,6.805,1142.91,-234.853],2142:[1.004,6.775,1141.941,-235.104]}
T=np.clip(C*255,0,255).astype(np.uint8); Tg=cv2.cvtColor(T,cv2.COLOR_BGR2GRAY)
mask=(A>0.99).astype(np.uint8)*255
orb=cv2.ORB_create(6000,scaleFactor=1.2,nlevels=6,fastThreshold=8)
kt,dt=orb.detectAndCompute(Tg,mask)
bf=cv2.BFMatcher(cv2.NORM_HAMMING)
def M(p):
    s,rd,tx,ty=p; r=math.radians(rd); a=s*math.cos(r); b=s*math.sin(r)
    return np.float32([[a,-b,tx],[b,a,ty]])
for k,wg in [(2139,0.15),(2140,0.3),(2141,0.45),(2142,0.5)]:
    F=fgx.load(k)
    Cw=cv2.warpAffine(C,M(Afit[k]),(2206,946)); Aw=cv2.warpAffine(A,M(Afit[k]),(2206,946))
    Am=Cw+P*(1-Aw[...,None])
    best=None
    for w in [wg]:
        R=(F-(1-w)*Am)/w   # residual = B-model
        g=np.clip(R*255,0,255).astype(np.uint8); g=cv2.cvtColor(g,cv2.COLOR_BGR2GRAY)
        kf,df=orb.detectAndCompute(g,None)
        ms=bf.knnMatch(dt,df,k=2); good=[m for m,n in ms if m.distance<0.8*n.distance]
        src=np.float32([kt[m.queryIdx].pt for m in good]); dst=np.float32([kf[m.trainIdx].pt for m in good])
        Mb,inl=cv2.estimateAffinePartial2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=3,maxIters=8000)
        n=int(inl.sum()) if inl is not None else 0
        a,b=Mb[0,0],Mb[1,0]
        print(k,'w',w,'B',[round(math.hypot(a,b),4),round(math.degrees(math.atan2(b,a)),2),round(float(Mb[0,2]),1),round(float(Mb[1,2]),1)],'inliers',n,'of',len(good))
