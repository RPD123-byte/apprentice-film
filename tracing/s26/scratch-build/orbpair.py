import cv2, glob, sys, numpy as np, re
# orbpair.py dir x0 y0 x1 y1 [times...]: similarity mapping render->source within region
d=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); ts=sys.argv[6:]
orb=cv2.ORB_create(4000)
for t in ts:
    f=glob.glob(f"{d}/frame-*-at-{t}s.png")[0]; r=f.replace('/frame-','/ref-')
    A=cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY); B=cv2.cvtColor(cv2.imread(r),cv2.COLOR_BGR2GRAY)
    m=np.zeros_like(A); m[y0:y1,x0:x1]=255
    ka,da=orb.detectAndCompute(A,m); kb,db=orb.detectAndCompute(B,m)
    if da is None or db is None: print(t,'nofeat'); continue
    bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
    ms=sorted(bf.match(da,db),key=lambda x:x.distance)[:600]
    P=np.float32([ka[x.queryIdx].pt for x in ms]); Q=np.float32([kb[x.trainIdx].pt for x in ms])
    M,inl=cv2.estimateAffinePartial2D(P,Q,ransacReprojThreshold=4)
    if M is None: print(t,'nofit'); continue
    s=np.hypot(M[0,0],M[1,0]); cx,cy=(x0+x1)/2,(y0+y1)/2
    dx=M[0,0]*cx+M[0,1]*cy+M[0,2]-cx; dy=M[1,0]*cx+M[1,1]*cy+M[1,2]-cy
    print(f"t={t} render->source s={s:.4f} rot={np.degrees(np.arctan2(M[1,0],M[0,0])):+.2f} region-centre shift ({dx:+.1f},{dy:+.1f}) inliers={int(inl.sum())}/{len(ms)}")
