# affine (partial) from the 125.0 head to the head at time T, by SIFT on the head region (measurement only)
import cv2, numpy as np, sys
from src import frame
A=frame(125.0,True); 
box=(600,80,1080,640)  # head region at 125.0
m=np.zeros_like(A); m[box[1]:box[3],box[0]:box[2]]=255
s=cv2.SIFT_create(4000)
ka,da=s.detectAndCompute(A,m)
for T in [float(v) for v in sys.argv[1:]]:
    B=frame(T,True); mb=np.zeros_like(B); mb[0:720,500:1300]=255
    kb,db=s.detectAndCompute(B,mb)
    mt=cv2.BFMatcher().knnMatch(da,db,k=2)
    g=[a for a,b in mt if a.distance<0.75*b.distance]
    pa=np.float32([ka[x.queryIdx].pt for x in g]); pb=np.float32([kb[x.trainIdx].pt for x in g])
    M,inl=cv2.estimateAffinePartial2D(pa,pb,method=cv2.RANSAC,ransacReprojThreshold=4)
    M2,inl2=cv2.estimateAffine2D(pa,pb,method=cv2.RANSAC,ransacReprojThreshold=4)
    sc=np.hypot(M[0,0],M[1,0]); rot=np.degrees(np.arctan2(M[1,0],M[0,0]))
    print(T,len(g),int(inl.sum()),'sim s=%.4f rot=%.2f t=(%.1f,%.1f)'%(sc,rot,M[0,2],M[1,2]),'aff',np.round(M2.ravel(),4).tolist(),int(inl2.sum()))
