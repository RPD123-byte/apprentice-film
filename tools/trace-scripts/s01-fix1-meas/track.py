import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(n):
    c.set(cv2.CAP_PROP_POS_FRAMES,n); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
ref=grab(0)
mask=np.full_like(ref,255)
mask[20:320,830:1320]=0     # screen/lid
mask[420:600,1040:1280]=0   # right hand
orb=cv2.ORB_create(8000); kr,dr=orb.detectAndCompute(ref,mask)
bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
for n in range(0,152,int(sys.argv[1]) if len(sys.argv)>1 else 3):
    g=grab(n); k,d=orb.detectAndCompute(g,None)
    m=sorted(bf.match(dr,d),key=lambda x:x.distance)[:1500]
    A=np.float32([kr[x.queryIdx].pt for x in m]); B=np.float32([k[x.trainIdx].pt for x in m])
    M,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=2,maxIters=5000,confidence=0.999)
    s=np.hypot(M[0,0],M[1,0]); rot=np.degrees(np.arctan2(M[1,0],M[0,0]))
    print(f"{n/25:.2f} {s:.4f} {rot:+.3f} {M[0,2]:8.2f} {M[1,2]:8.2f} {int(inl.sum())}")
