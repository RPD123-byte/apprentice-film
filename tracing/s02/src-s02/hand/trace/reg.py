import cv2, numpy as np, sys
S='../s02-r3-src'
def g(f): return cv2.imread(f'{S}/{f:04d}.png',0)
ref=g(int(sys.argv[1])); 
orb=cv2.ORB_create(6000); kr,dr=orb.detectAndCompute(ref,None)
bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
for f in [int(v) for v in sys.argv[2].split(',')]:
    im=g(f); m0=np.zeros_like(im); m0[:, :1400]=255   # left part (face) only
    k,d=orb.detectAndCompute(im,m0)
    m=sorted(bf.match(dr,d),key=lambda x:x.distance)[:600]
    A=np.float32([kr[x.queryIdx].pt for x in m]); B=np.float32([k[x.trainIdx].pt for x in m])
    M,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=3)
    s=np.hypot(M[0,0],M[1,0]); print(f, 's=%.4f tx=%.1f ty=%.1f inl=%d'%(s,M[0,2],M[1,2],inl.sum()))
