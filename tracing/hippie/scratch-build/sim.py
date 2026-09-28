import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
ta,tb=float(sys.argv[1]),float(sys.argv[2])
roi=[int(v) for v in sys.argv[3:7]]
A=grab(ta); B=grab(tb)
m=np.zeros_like(A); m[roi[1]:roi[3],roi[0]:roi[2]]=255
orb=cv2.ORB_create(8000)
ka,da=orb.detectAndCompute(A,m); kb,db=orb.detectAndCompute(B,None)
bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
mm=sorted(bf.match(da,db),key=lambda x:x.distance)[:1500]
P=np.float32([ka[x.queryIdx].pt for x in mm]); Q=np.float32([kb[x.trainIdx].pt for x in mm])
M,inl=cv2.estimateAffine2D(P,Q,ransacReprojThreshold=2)
print('affine',M.round(4).tolist(),'inl',int(inl.sum()))
M2,inl2=cv2.estimateAffinePartial2D(P,Q,ransacReprojThreshold=2)
s=np.hypot(M2[0,0],M2[1,0]); print('sim s=%.4f tx=%.1f ty=%.1f inl=%d'%(s,M2[0,2],M2[1,2],int(inl2.sum())))
