import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
ta,tb=float(sys.argv[1]),float(sys.argv[2])
ra=[int(v) for v in sys.argv[3:7]]; rb=[int(v) for v in sys.argv[7:11]]
A=grab(ta); B=grab(tb)
ma=np.zeros_like(A); ma[ra[1]:ra[3],ra[0]:ra[2]]=255
mb=np.zeros_like(B); mb[rb[1]:rb[3],rb[0]:rb[2]]=255
orb=cv2.ORB_create(8000)
ka,da=orb.detectAndCompute(A,ma); kb,db=orb.detectAndCompute(B,mb)
bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
mm=sorted(bf.match(da,db),key=lambda x:x.distance)[:1500]
P=np.float32([ka[x.queryIdx].pt for x in mm]); Q=np.float32([kb[x.trainIdx].pt for x in mm])
M2,inl2=cv2.estimateAffinePartial2D(P,Q,ransacReprojThreshold=3)
s=np.hypot(M2[0,0],M2[1,0]); print('sim s=%.4f rot=%.2f tx=%.1f ty=%.1f inl=%d of %d'%(s,np.degrees(np.arctan2(M2[1,0],M2[0,0])),M2[0,2],M2[1,2],int(inl2.sum()),len(mm)))
