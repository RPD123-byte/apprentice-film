import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(1,int(round(t*25))); ok,f=c.read(); return f
ref=cv2.imread('snapshots/s08-ref/f24.9.png')
H0=np.load('snapshots/s08-ref/H24.9.npy')
W,H=1600,1000
refr=cv2.warpPerspective(ref,H0,(W,H))
orb=cv2.ORB_create(6000)
mask=np.zeros(ref.shape[:2],np.uint8)
cv2.fillPoly(mask,[np.int32([[315,246],[834,168],[898,519],[409,648]])],255)
kr,dr=orb.detectAndCompute(cv2.cvtColor(ref,cv2.COLOR_BGR2GRAY),mask)
for t in map(float,sys.argv[1:]):
    f=grab(t)
    k,d=orb.detectAndCompute(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY),None)
    m=sorted(cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True).match(dr,d),key=lambda x:x.distance)[:1500]
    A=np.float32([kr[x.queryIdx].pt for x in m]); B=np.float32([k[x.trainIdx].pt for x in m])
    Hm,inl=cv2.findHomography(A,B,cv2.RANSAC,3)
    # page -> frame t : Hm @ inv(H0)
    P=Hm@np.linalg.inv(H0)
    np.save(f'snapshots/s08-ref/Hpage{t:.2f}.npy',P)
    r=cv2.warpPerspective(f,np.linalg.inv(P),(W,H),flags=cv2.INTER_CUBIC)
    cv2.imwrite(f'snapshots/s08-ref/rect{t:.2f}.png',r)
    corners=cv2.perspectiveTransform(np.float32([[[0,0],[W,0],[W,H],[0,H]]]),P)[0]
    print(t,int(inl.sum()),np.round(corners,1).tolist())
