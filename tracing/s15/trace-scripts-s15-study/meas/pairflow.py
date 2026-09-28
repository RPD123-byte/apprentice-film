# pairwise motion between consecutive source frames: similarity fit (s, rot, tx, ty) + fixed point, and median flow per region
import cv2,numpy as np,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
t0,t1=float(sys.argv[1]),float(sys.argv[2])
c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t0*25)))
def rd():
    ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
prev=rd(); t=t0
orb=cv2.ORB_create(4000); bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
while t<t1-1e-6:
    cur=rd(); t+=0.04
    mask=np.full_like(prev,255); mask[400:900,800:1500]=0  # rough owl zone
    k1,d1=orb.detectAndCompute(prev,mask); k2,d2=orb.detectAndCompute(cur,None)
    if d1 is None or d2 is None: print(f'{t:.2f} none'); prev=cur; continue
    m=sorted(bf.match(d1,d2),key=lambda x:x.distance)[:1000]
    A=np.float32([k1[x.queryIdx].pt for x in m]); B=np.float32([k2[x.trainIdx].pt for x in m])
    M,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=4)
    if M is None: print(f'{t:.2f} nofit'); prev=cur; continue
    s=np.hypot(M[0,0],M[1,0]); rot=np.degrees(np.arctan2(M[1,0],M[0,0]))
    fx=M[0,2]/(1-s) if abs(1-s)>1e-3 else float('nan'); fy=M[1,2]/(1-s) if abs(1-s)>1e-3 else float('nan')
    # displacement at left/right thirds
    inl=inl.ravel().astype(bool); d=B-A
    L=d[(A[:,0]<700)&inl]; R=d[(A[:,0]>1500)&inl]
    ml=np.median(L,axis=0) if len(L) else [np.nan,np.nan]; mr=np.median(R,axis=0) if len(R) else [np.nan,np.nan]
    print(f'{t:.2f} s={s:.4f} rot={rot:+.2f} tx={M[0,2]:7.1f} ty={M[1,2]:7.1f} fix=({fx:6.0f},{fy:5.0f}) inl={inl.sum():4d} L=({ml[0]:6.1f},{ml[1]:5.1f}) R=({mr[0]:6.1f},{mr[1]:5.1f})')
    prev=cur
