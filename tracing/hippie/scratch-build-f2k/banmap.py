import cv2, numpy as np, sys
col=cv2.imread('ref-117.0.png',0)
sift=cv2.SIFT_create(8000)
m1=np.zeros_like(col); m1[0:420,:]=255; m1[40:260,1900:2206]=0  # exclude owl
k1,d1=sift.detectAndCompute(col,m1)
FR=dict(x=161.16,y=132.76,sx=0.8444,sy=0.8462)
for t in sys.argv[1:]:
  f=cv2.imread(f'ref-{t}.png',0)
  m2=np.zeros_like(f); m2[190:357,198:1970]=255
  k2,d2=sift.detectAndCompute(f,m2)
  bf=cv2.BFMatcher(); ms=bf.knnMatch(d1,d2,k=2)
  good=[a for a,b in ms if a.distance<0.75*b.distance]
  p1=np.float32([k1[m.queryIdx].pt for m in good]); p2=np.float32([k2[m.trainIdx].pt for m in good])
  A,inl=cv2.estimateAffine2D(p1,p2,ransacReprojThreshold=2.0)
  S,inl2=cv2.estimateAffinePartial2D(p1,p2,ransacReprojThreshold=2.0)
  n=int(inl.sum())
  # colour->page via FRAMED: page=(frame-FR)/FRs
  sx=A[0,0]/FR['sx']; sy=A[1,1]/FR['sy']; tx=(A[0,2]-FR['x'])/FR['sx']; ty=(A[1,2]-FR['y'])/FR['sy']
  res=np.abs((p1[inl.ravel()==1]@A[:,:2].T+A[:,2])-p2[inl.ravel()==1]).mean()
  print(t,'inl',n,'affine',np.round(A,4).tolist(),'res',round(float(res),2))
  print('   colour->page sx %.4f sy %.4f tx %.1f ty %.1f  (shear %.4f %.4f)'%(sx,sy,tx,ty,A[0,1],A[1,0]))
  s=np.hypot(S[0,0],S[1,0]); print('   similarity s %.4f rot %.4f tx %.1f ty %.1f inl %d'%(s,np.arctan2(S[1,0],S[0,0]),S[0,2],S[1,2],inl2.sum()))
