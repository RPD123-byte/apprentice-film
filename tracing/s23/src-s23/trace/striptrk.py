import cv2, numpy as np, math, sys
import fgx
T=cv2.cvtColor(cv2.imread('f1940.png'),cv2.COLOR_BGR2GRAY)
x0,y0,x1,y1=196,188,1225,358
mask=np.zeros_like(T); mask[y0:y1,x0:x1]=255
orb=cv2.ORB_create(6000,scaleFactor=1.2,nlevels=6,fastThreshold=10)
kt,dt=orb.detectAndCompute(T,mask)
bf=cv2.BFMatcher(cv2.NORM_HAMMING)
def sim(M):
    a,b=M[0,0],M[1,0]; s=math.hypot(a,b); r=math.degrees(math.atan2(b,a)); return [round(s,4),round(r,2),round(float(M[0,2]),1),round(float(M[1,2]),1)]
ks=list(range(int(sys.argv[1]),int(sys.argv[2])+1))
for k in ks:
    im=cv2.imread('src/%05d.png'%k); g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
    g=cv2.createCLAHE(2.0,(8,8)).apply(g)
    kf,df=orb.detectAndCompute(g,None)
    ms=bf.knnMatch(dt,df,k=2)
    good=[m for m,n in ms if m.distance<0.8*n.distance]
    src=np.float32([kt[m.queryIdx].pt for m in good]); dst=np.float32([kf[m.trainIdx].pt for m in good])
    out=[]
    rem=np.ones(len(good),bool)
    for it in range(2):
        if rem.sum()<10: break
        M,inl=cv2.estimateAffinePartial2D(src[rem],dst[rem],method=cv2.RANSAC,ransacReprojThreshold=2.5,maxIters=5000)
        if M is None: break
        inl=inl.ravel().astype(bool); n=inl.sum()
        if n<12: break
        out.append((sim(M),int(n)))
        idx=np.nonzero(rem)[0]; rem[idx[inl]]=False
    print(k, '%.2f'%(k/25), out)
