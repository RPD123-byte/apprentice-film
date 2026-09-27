import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); return f
def match(A,B,maskA=None,maskB=None,full=False,n=8000,thr=3):
    orb=cv2.ORB_create(n)
    ga=cv2.cvtColor(A,cv2.COLOR_BGR2GRAY); gb=cv2.cvtColor(B,cv2.COLOR_BGR2GRAY)
    ka,da=orb.detectAndCompute(ga,maskA); kb,db=orb.detectAndCompute(gb,maskB)
    bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
    m=sorted(bf.match(da,db),key=lambda x:x.distance)[:1500]
    P=np.float32([ka[x.queryIdx].pt for x in m]); Q=np.float32([kb[x.trainIdx].pt for x in m])
    if full: M,inl=cv2.estimateAffine2D(P,Q,ransacReprojThreshold=thr)
    else: M,inl=cv2.estimateAffinePartial2D(P,Q,ransacReprojThreshold=thr)
    return M,int(inl.sum()),P[inl.ravel()==1],Q[inl.ravel()==1]
if __name__=='__main__':
    ta=float(sys.argv[1]); tb=float(sys.argv[2]); full=len(sys.argv)>3 and sys.argv[3]=='full'
    M,n,P,Q=match(grab(ta),grab(tb),full=full)
    np.set_printoptions(suppress=True,precision=4)
    print(M, n)
    print('src bbox of inliers', P.min(0), P.max(0))
