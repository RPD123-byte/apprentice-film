# chained camera track: frame-to-frame similarity (ORB+RANSAC on CLAHE-enhanced frames), accumulated.
# usage: chain.py F0 F1 [maskspec...]   maskspec: per-frame exclusion handled by --excl x0,y0,x1,y1@f0-f1
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); fps=25
f0,f1=int(sys.argv[1]),int(sys.argv[2])
excl=[]
for a in sys.argv[3:]:
    r,fr=a.split('@'); x0,y0,x1,y1=map(int,r.split(',')); a0,a1=map(int,fr.split('-')); excl.append((x0,y0,x1,y1,a0,a1))
cl=cv2.createCLAHE(clipLimit=3.0,tileGridSize=(8,8))
def grab(f):
    c.set(1,f); ok,im=c.read(); g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
    return cl.apply(g)
def mask(f,shape):
    m=np.full(shape,255,np.uint8)
    for x0,y0,x1,y1,a0,a1 in excl:
        if a0<=f<=a1: m[y0:y1,x0:x1]=0
    return m
orb=cv2.ORB_create(4000); bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
T=np.eye(3)  # maps frame f0 coords -> current frame coords
prev=grab(f0); kp,dp=orb.detectAndCompute(prev,mask(f0,prev.shape))
print(f"{f0} t={f0/fps:.2f} s=1.0000 tx=0.0 ty=0.0")
for f in range(f0+1,f1+1):
    g=grab(f); k,d=orb.detectAndCompute(g,mask(f,g.shape))
    M=None; n=0
    if d is not None and dp is not None and len(k)>10:
        m=sorted(bf.match(dp,d),key=lambda x:x.distance)[:600]
        if len(m)>8:
            A=np.float32([kp[x.queryIdx].pt for x in m]); B=np.float32([k[x.trainIdx].pt for x in m])
            M,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=2.5)
            n=int(inl.sum()) if M is not None else 0
    if M is None or n<8:
        # phase correlation fallback (translation only)
        a=np.float32(prev); b=np.float32(g); (dx,dy),resp=cv2.phaseCorrelate(a,b)
        M=np.array([[1,0,dx],[0,1,dy]]); tag=f'PC resp={resp:.2f}'
    else: tag=f'inl={n}'
    T=np.vstack([M,[0,0,1]])@T
    s=np.hypot(T[0,0],T[1,0]); rot=np.degrees(np.arctan2(T[1,0],T[0,0]))
    sd=np.hypot(M[0,0],M[1,0])
    print(f"{f} t={f/fps:.2f} s={s:.4f} rot={rot:+.2f} tx={T[0,2]:8.1f} ty={T[1,2]:8.1f}  step: ds={sd:.4f} dx={M[0,2]:6.1f} dy={M[1,2]:6.1f} {tag}")
    prev,kp,dp=g,k,d
