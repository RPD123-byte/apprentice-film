import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); fps=c.get(5)
def grab(t, gray=True):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*fps))); ok,f=c.read()
    return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY) if gray else f
# args: tref x0 y0 x1 y1 t0 t1 step [sx0 sy0 sx1 sy1 search roi]
a=[float(v) for v in sys.argv[1:]]
tref=a[0]; r=[int(v) for v in a[1:5]]; t0,t1,step=a[5:8]
sr=[int(v) for v in a[8:12]] if len(a)>=12 else None
ref=grab(tref); m=np.zeros_like(ref); m[r[1]:r[3],r[0]:r[2]]=255
orb=cv2.ORB_create(6000); kr,dr=orb.detectAndCompute(ref,m)
bf=cv2.BFMatcher(cv2.NORM_HAMMING)
t=t0
while t<=t1+1e-6:
    g=grab(t); mm=None
    if sr: mm=np.zeros_like(g); mm[sr[1]:sr[3],sr[0]:sr[2]]=255
    k,d=orb.detectAndCompute(g,mm)
    if d is None: print(f"{t:.2f} none"); t+=step; continue
    ms=bf.knnMatch(dr,d,k=2); good=[x[0] for x in ms if len(x)==2 and x[0].distance<0.8*x[1].distance]
    if len(good)<6: print(f"{t:.2f} few {len(good)}"); t+=step; continue
    A=np.float32([kr[x.queryIdx].pt for x in good]); B=np.float32([k[x.trainIdx].pt for x in good])
    M,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=4,maxIters=5000)
    if M is None: print(f"{t:.2f} nofit"); t+=step; continue
    s=np.hypot(M[0,0],M[1,0]); rot=np.degrees(np.arctan2(M[1,0],M[0,0]))
    # corners of ref roi mapped
    cs=[(r[0],r[1]),(r[2],r[1]),(r[2],r[3]),(r[0],r[3])]
    cm=[(M[0,0]*x+M[0,1]*y+M[0,2], M[1,0]*x+M[1,1]*y+M[1,2]) for x,y in cs]
    print(f"{t:.2f} s={s:.4f} rot={rot:+6.2f} tx={M[0,2]:8.1f} ty={M[1,2]:8.1f} n={int(inl.sum()):4d}/{len(good)} TL=({cm[0][0]:.0f},{cm[0][1]:.0f}) BR=({cm[2][0]:.0f},{cm[2][1]:.0f})")
    t+=step
