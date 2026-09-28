# Estimate a similarity transform (scale + translation) of each frame relative to a reference frame,
# using ORB features on a masked region. Prints s, tx, ty per sample so a camera move can be copied.
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
t0,t1,step=float(sys.argv[1]),float(sys.argv[2]),float(sys.argv[3])
c=cv2.VideoCapture(V); fps=c.get(5)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*fps))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
ref=grab(t0); orb=cv2.ORB_create(4000); kr,dr=orb.detectAndCompute(ref,None)
bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
t=t0
while t<=t1+1e-6:
    g=grab(t); k,d=orb.detectAndCompute(g,None); m=sorted(bf.match(dr,d),key=lambda x:x.distance)[:600]
    A=np.float32([kr[x.queryIdx].pt for x in m]); B=np.float32([k[x.trainIdx].pt for x in m])
    M,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=3)
    s=np.hypot(M[0,0],M[1,0]); print(f"t={t:6.2f} s={s:.4f} tx={M[0,2]:8.1f} ty={M[1,2]:8.1f} inl={int(inl.sum())}")
    t+=step
