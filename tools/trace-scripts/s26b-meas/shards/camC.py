import cv2, numpy as np, json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def g(F): c.set(1,F); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
ref=g(2800); m=np.full(ref.shape,255,np.uint8); m[250:800,650:1600]=0   # ignore the owl
orb=cv2.ORB_create(10000); ka,da=orb.detectAndCompute(ref,m)
out={}
for F in range(2790,2818):
    b=g(F); kb,db=orb.detectAndCompute(b,None)
    mt=sorted(cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True).match(da,db),key=lambda x:x.distance)[:2500]
    A=np.float32([ka[x.queryIdx].pt for x in mt]); B=np.float32([kb[x.trainIdx].pt for x in mt])
    M,inl=cv2.estimateAffine2D(A,B,ransacReprojThreshold=2)
    out[F]=[round(float(v),5) for v in M.ravel()]
    print(F,'inl',int(inl.sum()),' '.join('%.4f'%v for v in M.ravel()))
json.dump(out,open('camAffC.json','w'))
