import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
def meas(ref,g,blur=0):
    if blur: ref=cv2.GaussianBlur(ref,(0,0),blur); g=cv2.GaussianBlur(g,(0,0),blur)
    orb=cv2.ORB_create(6000); mask=np.full(ref.shape,255,np.uint8); mask[250:650,300:950]=0
    kr,dr=orb.detectAndCompute(ref,mask); k,d=orb.detectAndCompute(g,None)
    m=sorted(cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True).match(dr,d),key=lambda x:x.distance)[:1000]
    A=np.float32([kr[x.queryIdx].pt for x in m]); B=np.float32([k[x.trainIdx].pt for x in m])
    M,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=3)
    return np.hypot(M[0,0],M[1,0]),M[0,2],M[1,2],int(inl.sum())
ref=grab(47.92)
for t in [47.80,47.84,47.88,47.96]:
    for b in [0,1.5]:
        s,tx,ty,n=meas(ref,grab(t),b)
        print(f'{t:.2f} blur{b} s={s:.4f} abs={s*1.6346:.4f} tx={tx:.1f} ty={ty:.1f} fp=({tx/(1-s):.0f},{ty/(1-s):.0f}) inl={n}')
