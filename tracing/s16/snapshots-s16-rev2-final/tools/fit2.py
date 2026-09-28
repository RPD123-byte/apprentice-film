import cv2, numpy as np, sys
orb=cv2.ORB_create(8000)
x0,y0,x1,y1=map(int,sys.argv[1:5])
for n in map(int,sys.argv[5:]):
    a=cv2.imread(f's16-rev2-exact/r{n}.png',0); b=cv2.imread(f's16-rev2-src/s{n}.png',0)
    mk=np.zeros_like(a); mk[y0:y1,x0:x1]=255
    ka,da=orb.detectAndCompute(a,mk); kb,db=orb.detectAndCompute(b,mk)
    m=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True).match(da,db)
    pa=np.float32([ka[x.queryIdx].pt for x in m]); pb=np.float32([kb[x.trainIdx].pt for x in m])
    M,inl=cv2.estimateAffine2D(pa,pb,ransacReprojThreshold=2)
    c=np.array([(x0+x1)/2,(y0+y1)/2,1]); d=M@c-c[:2]
    print(n, 'inl',int(inl.sum()),'/',len(m), 'scale',np.round([M[0,0],M[1,1]],4).tolist(),'shift at centre',np.round(d,2).tolist())
