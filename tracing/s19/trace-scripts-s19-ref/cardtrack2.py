import cv2,numpy as np,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
ref=grab(57.32)
Q=np.float32([[1090,78],[1600,55],[1680,800],[1000,778]])
mask=np.zeros_like(ref); cv2.fillConvexPoly(mask,Q.astype(np.int32),255)
mask=cv2.erode(mask,np.ones((9,9),np.uint8))
sift=cv2.SIFT_create(6000,contrastThreshold=0.02)
kr,dr=sift.detectAndCompute(ref,mask)
bg=grab(63.08)  # to reject static background matches, compare with bg
bf=cv2.BFMatcher()
t0,t1,step=[float(x) for x in sys.argv[1:4]]
t=t0
while t<=t1+1e-6:
    g=grab(t)
    k,d=sift.detectAndCompute(g,None)
    ms=bf.knnMatch(dr,d,k=2)
    good=[a for a,b in ms if a.distance<0.8*b.distance]
    A=np.float32([kr[x.queryIdx].pt for x in good]); B=np.float32([k[x.trainIdx].pt for x in good])
    if len(good)<6: print(f'{t:.2f} few {len(good)}'); t+=step; continue
    H,inl=cv2.findHomography(A,B,cv2.RANSAC,4.0)
    q=cv2.perspectiveTransform(Q.reshape(-1,1,2),H).reshape(-1,2)
    print(f'{t:.2f} n={int(inl.sum())}/{len(good)} quad='+' '.join(f'({x:.0f},{y:.0f})' for x,y in q))
    t+=step
