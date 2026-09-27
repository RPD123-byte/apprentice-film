import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(1,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
a=grab(float(sys.argv[1])); b=grab(float(sys.argv[2]))
mask=np.full_like(a,255); mask[150:900,500:1560]=0   # exclude owl/card/scissors
orb=cv2.ORB_create(8000); ka,da=orb.detectAndCompute(a,mask); kb,db=orb.detectAndCompute(b,None)
m=sorted(cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True).match(da,db),key=lambda x:x.distance)[:1500]
A=np.float32([ka[x.queryIdx].pt for x in m]); B=np.float32([kb[x.trainIdx].pt for x in m])
M,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=3); print('sim',M.round(4).tolist(),int(inl.sum()))
Hm,inl2=cv2.findHomography(A,B,cv2.RANSAC,3); print('H',Hm.round(6).tolist(),int(inl2.sum()))
inl=inl.ravel()>0
res=(A[inl]@M[:,:2].T+M[:,2])-B[inl]; print('sim resid',np.abs(res).mean(0))
# residual by region
for x0 in range(0,2206,400):
    sel=(A[:,0]>=x0)&(A[:,0]<x0+400)
    if sel.sum()>5:
        r=(A[sel]@M[:,:2].T+M[:,2])-B[sel]; print(x0, sel.sum(), np.median(r,0).round(1))
