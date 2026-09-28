from fr import seq, frame
import numpy as np, cv2, sys
ref=frame(76.0)
mask=np.zeros_like(ref); mask[195:352,300:1965]=255
orb=cv2.ORB_create(4000); kr,dr=orb.detectAndCompute(ref,mask)
bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
t0,t1=float(sys.argv[1]),float(sys.argv[2])
for t,f in seq(t0,t1):
    m2=np.zeros_like(f); m2[120:400,250:2000]=255
    k,d=orb.detectAndCompute(f,m2)
    m=sorted(bf.match(dr,d),key=lambda x:x.distance)[:600]
    A=np.float32([kr[x.queryIdx].pt for x in m]); B=np.float32([k[x.trainIdx].pt for x in m])
    M,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=2.5)
    s=np.hypot(M[0,0],M[1,0]); rot=np.degrees(np.arctan2(M[1,0],M[0,0]))
    # displacement of strip corners
    pts=np.float32([[193.5,185.3],[1974,185.3],[1974,360.8],[193.5,360.8]])
    q=pts@M[:,:2].T+M[:,2]
    dd=' '.join(f"({q[i,0]-pts[i,0]:+5.1f},{q[i,1]-pts[i,1]:+5.1f})" for i in range(4))
    print(f"{t:6.2f} s={s:.4f} rot={rot:+.3f} tx={M[0,2]:+6.1f} ty={M[1,2]:+6.1f} inl={int(inl.sum()):3d} corners TL,TR,BR,BL {dd}")
