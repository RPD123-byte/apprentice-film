# aff.py F0 F1 [x0 y0 x1 y1]: full affine of frame F1 relative to F0 (ORB + RANSAC)
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def g(F):
    c.set(1,F); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
F0,F1=int(sys.argv[1]),int(sys.argv[2]); roi=[int(v) for v in sys.argv[3:7]] if len(sys.argv)>6 else None
a=g(F0); b=g(F1)
m=None
if roi: m=np.zeros_like(a); m[roi[1]:roi[3],roi[0]:roi[2]]=255
orb=cv2.ORB_create(8000); ka,da=orb.detectAndCompute(a,m); kb,db=orb.detectAndCompute(b,m)
mt=sorted(cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True).match(da,db),key=lambda x:x.distance)[:1500]
A=np.float32([ka[x.queryIdx].pt for x in mt]); B=np.float32([kb[x.trainIdx].pt for x in mt])
M,inl=cv2.estimateAffine2D(A,B,ransacReprojThreshold=2)
print(f'{F0}->{F1}  x\'={M[0,0]:.4f}x{M[0,1]:+.4f}y{M[0,2]:+.1f}  y\'={M[1,0]:+.4f}x{M[1,1]:.4f}y{M[1,2]:+.1f}  inl={int(inl.sum())}')
