# glob.py F : global similarity of the B&W content (A median, stage coords) and of the colour content (117.48) in frame F
import cv2, numpy as np, json, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
def grab(F): cap.set(1,F); ok,f=cap.read(); return f
F=int(sys.argv[1]); thr=float(sys.argv[2]) if len(sys.argv)>2 else 8
g=cv2.cvtColor(grab(F),cv2.COLOR_BGR2GRAY)
A=cv2.cvtColor(cv2.imread('../medA.png'),cv2.COLOR_BGR2GRAY)
# mask the header banner out of A (colour strip; it is matched as colour)
mA=np.full(A.shape,255,np.uint8); mA[170:370,180:1990]=0
Cg=cv2.cvtColor(grab(2937),cv2.COLOR_BGR2GRAY)
sift=cv2.SIFT_create(nfeatures=30000, contrastThreshold=0.015)
kf,df=sift.detectAndCompute(g,None)
res={}
for name,ref,m in (('bw',A,mA),('col',Cg,None)):
    kr,dr=sift.detectAndCompute(ref,m)
    ms=cv2.BFMatcher(cv2.NORM_L2).knnMatch(df,dr,k=2)
    good=[a for a,b in ms if a.distance<0.8*b.distance]
    P=np.float32([kr[a.trainIdx].pt for a in good]); Q=np.float32([kf[a.queryIdx].pt for a in good])
    M,inl=cv2.estimateAffinePartial2D(P,Q,ransacReprojThreshold=thr,maxIters=20000,confidence=0.9999)
    inl=inl.ravel().astype(bool)
    err=np.hypot(*((P[inl]@M[:,:2].T+M[:,2])-Q[inl]).T)
    s=np.hypot(M[0,0],M[1,0]); print(name,'matches',len(good),'inliers',inl.sum(),'s=%.4f rot=%.2f tx=%.1f ty=%.1f'%(s,np.degrees(np.arctan2(M[1,0],M[0,0])),M[0,2],M[1,2]),'median err %.2f'%np.median(err),
      'fixed pt (%.0f,%.0f)'%(M[0,2]/(1-s),M[1,2]/(1-s)) if abs(1-s)>1e-3 else '')
    res[name]={'M':M.tolist(),'pts':Q[inl].tolist(),'refpts':P[inl].tolist()}
json.dump(res,open(f'glob-{F}.json','w'))
