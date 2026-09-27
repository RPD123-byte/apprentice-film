import cv2, numpy as np, sys
# track a region (ROI at ref frame) through the extracted frames with ORB+RANSAC similarity
ref=int(sys.argv[1]); k0=int(sys.argv[2]); k1=int(sys.argv[3]); roi=[int(v) for v in sys.argv[4:8]]
thr=float(sys.argv[8]) if len(sys.argv)>8 else 0
F=lambda k: cv2.cvtColor(cv2.imread('snapshots/s24-study/fr/f%03d.png'%k),cv2.COLOR_BGR2GRAY)
R=F(ref); mask=np.zeros_like(R); mask[roi[1]:roi[3],roi[0]:roi[2]]=255
orb=cv2.ORB_create(6000); kr,dr=orb.detectAndCompute(R,mask)
bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
cx,cy=(roi[0]+roi[2])/2,(roi[1]+roi[3])/2
for k in range(k0,k1+1):
    g=F(k); kk,d=orb.detectAndCompute(g,None)
    m=sorted(bf.match(dr,d),key=lambda x:x.distance)[:800]
    A=np.float32([kr[x.queryIdx].pt for x in m]); B=np.float32([kk[x.trainIdx].pt for x in m])
    M,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=3)
    if M is None: print(k,'nofit'); continue
    s=np.hypot(M[0,0],M[1,0]); rot=np.degrees(np.arctan2(M[1,0],M[0,0]))
    p=M@np.array([cx,cy,1])
    print(f"f{k:03d} t={96.8+k*0.04:6.2f} s={s:.4f} rot={rot:+.2f} center->({p[0]:7.1f},{p[1]:6.1f}) inl={int(inl.sum())}")
