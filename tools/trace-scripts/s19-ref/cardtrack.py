import cv2,numpy as np,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
ref=grab(57.32)
# card quad at 57.32 (approx, frame px): TL, TR, BR, BL
Q=np.float32([[1090,78],[1600,55],[1680,800],[1000,778]])
mask=np.zeros_like(ref); cv2.fillConvexPoly(mask,Q.astype(np.int32),255)
mask=cv2.erode(mask,np.ones((15,15),np.uint8))
sift=cv2.SIFT_create(4000)
kr,dr=sift.detectAndCompute(ref,mask)
print('ref kp',len(kr))
bf=cv2.BFMatcher()
Hprev=np.eye(3)
t0,t1,step=[float(x) for x in sys.argv[1:4]]
t=t0
res=[]
while t<=t1+1e-6:
    g=grab(t)
    # restrict search to where the card should be (prev H), dilated
    Qp=cv2.perspectiveTransform(Q.reshape(-1,1,2),Hprev).reshape(-1,2)
    m2=np.zeros_like(g); cv2.fillConvexPoly(m2,Qp.astype(np.int32),255); m2=cv2.dilate(m2,np.ones((61,61),np.uint8))
    k,d=sift.detectAndCompute(g,m2)
    if d is None: print(t,'nofeat'); t+=step; continue
    ms=bf.knnMatch(dr,d,k=2)
    good=[a for a,b in ms if a.distance<0.75*b.distance]
    if len(good)<8: print(f'{t:.2f} few',len(good)); t+=step; continue
    A=np.float32([kr[x.queryIdx].pt for x in good]); B=np.float32([k[x.trainIdx].pt for x in good])
    H,inl=cv2.findHomography(A,B,cv2.RANSAC,3.0)
    if H is None: print(t,'nofit'); t+=step; continue
    Hprev=H
    q=cv2.perspectiveTransform(Q.reshape(-1,1,2),H).reshape(-1,2)
    print(f'{t:.2f} n={int(inl.sum())}/{len(good)} quad='+' '.join(f'({x:.0f},{y:.0f})' for x,y in q))
    res.append([t]+q.flatten().tolist()+H.flatten().tolist())
    t+=step
np.save('cardtrack_%s_%s.npy'%(sys.argv[1],sys.argv[2]),np.array(res))
