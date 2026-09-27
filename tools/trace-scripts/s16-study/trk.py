import cv2,numpy as np,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(i):
    c.set(cv2.CAP_PROP_POS_FRAMES,i); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
orb=cv2.ORB_create(8000); bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
ref_i=int(sys.argv[1]); idxs=range(int(sys.argv[2]),int(sys.argv[3])+1)
rects=[tuple(map(int,r.split(','))) for r in sys.argv[4:]]
ref=grab(ref_i); m=np.zeros_like(ref)
for x0,y0,x1,y1 in rects: m[y0:y1,x0:x1]=255
kr,dr=orb.detectAndCompute(ref,m)
for i in idxs:
    g=grab(i)
    k,d=orb.detectAndCompute(g,None)
    ms=sorted(bf.match(dr,d),key=lambda x:x.distance)[:1500]
    A=np.float32([kr[x.queryIdx].pt for x in ms]); B=np.float32([k[x.trainIdx].pt for x in ms])
    M,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=2.5)
    s=np.hypot(M[0,0],M[1,0]); r=np.degrees(np.arctan2(M[1,0],M[0,0]))
    # where does frame centre (1103,473) go
    cx=M[0,0]*1103+M[0,1]*473+M[0,2]; cy=M[1,0]*1103+M[1,1]*473+M[1,2]
    print(i, f'{i/25:.2f}', f's={s:.4f} rot={r:+.3f} tx={M[0,2]:7.1f} ty={M[1,2]:7.1f} centre->({cx-1103:+6.1f},{cy-473:+6.1f}) inl={int(inl.sum())}')
