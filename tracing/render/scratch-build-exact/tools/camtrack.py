#!/usr/bin/env python3
# Measure a camera move in the SOURCE film: the similarity transform (scale s, translation tx,ty) of each
# sampled frame relative to the frame at t0, from ORB feature matches (RANSAC).
#   x_t = s * x_t0 + tx   (frame pixels).  Fixed point of a pure zoom: (tx/(1-s), ty/(1-s)).
# Usage: tools/camtrack.py T0 T1 STEP [x0 y0 x1 y1]   (optional region to track, e.g. to ignore a moving character)
import cv2, numpy as np, sys, os
V=os.environ.get('REF','/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4')
t0,t1,step=float(sys.argv[1]),float(sys.argv[2]),float(sys.argv[3])
roi=[int(v) for v in sys.argv[4:8]] if len(sys.argv)>=8 else None
c=cv2.VideoCapture(V); fps=c.get(5)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*fps))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
ref=grab(t0); mask=None
if roi: mask=np.zeros_like(ref); mask[roi[1]:roi[3],roi[0]:roi[2]]=255
orb=cv2.ORB_create(5000); kr,dr=orb.detectAndCompute(ref,mask)
bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
t=t0
while t<=t1+1e-6:
    g=grab(t); k,d=orb.detectAndCompute(g,None)
    if d is None or dr is None: print(f"t={t:7.2f} no features"); t+=step; continue
    m=sorted(bf.match(dr,d),key=lambda x:x.distance)[:800]
    A=np.float32([kr[x.queryIdx].pt for x in m]); B=np.float32([k[x.trainIdx].pt for x in m])
    M,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=3)
    if M is None: print(f"t={t:7.2f} no fit"); t+=step; continue
    s=np.hypot(M[0,0],M[1,0]); rot=np.degrees(np.arctan2(M[1,0],M[0,0]))
    print(f"t={t:7.2f} s={s:.4f} rot={rot:+.2f} tx={M[0,2]:8.1f} ty={M[1,2]:8.1f} inliers={int(inl.sum())}")
    t+=step
