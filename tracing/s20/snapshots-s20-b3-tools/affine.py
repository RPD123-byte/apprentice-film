#!/usr/bin/env python3
# full affine of source frame t vs frame t0 (ORB + RANSAC), masking the middle (owl) band
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
t0=float(sys.argv[1]); ts=[float(x) for x in sys.argv[2].split(',')]
c=cv2.VideoCapture(V)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
ref=grab(t0); m=np.full_like(ref,255); m[:,760:1200]=0
orb=cv2.ORB_create(8000); kr,dr=orb.detectAndCompute(ref,m)
bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
for t in ts:
    g=grab(t); k,d=orb.detectAndCompute(g,m)
    mm=sorted(bf.match(dr,d),key=lambda x:x.distance)[:1500]
    A=np.float32([kr[x.queryIdx].pt for x in mm]); B=np.float32([k[x.trainIdx].pt for x in mm])
    M,inl=cv2.estimateAffine2D(A,B,ransacReprojThreshold=2,maxIters=5000,refineIters=50)
    r=(A[inl[:,0]==1]@M[:,:2].T+M[:,2])-B[inl[:,0]==1]
    print(f"t={t:.2f} a={M[0,0]:.4f} b={M[1,0]:.4f} c={M[0,1]:.4f} d={M[1,1]:.4f} e={M[0,2]:.2f} f={M[1,2]:.2f} inl={int(inl.sum())} res={np.sqrt((r**2).sum(1)).mean():.2f}")
