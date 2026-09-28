# fit.py frames... : similarity/affine from render to source (ORB+RANSAC) per frame
import cv2, numpy as np, sys
orb=cv2.ORB_create(6000)
for n in map(int,sys.argv[1:]):
    a=cv2.imread(f's16-rev2-exact/r{n}.png',0); b=cv2.imread(f's16-rev2-src/s{n}.png',0)
    ka,da=orb.detectAndCompute(a,None); kb,db=orb.detectAndCompute(b,None)
    m=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True).match(da,db)
    pa=np.float32([ka[x.queryIdx].pt for x in m]); pb=np.float32([kb[x.trainIdx].pt for x in m])
    M,inl=cv2.estimateAffine2D(pa,pb,ransacReprojThreshold=3)
    print(n, 'inliers',int(inl.sum()),'/',len(m), 'A=',np.round(M,3).tolist())
