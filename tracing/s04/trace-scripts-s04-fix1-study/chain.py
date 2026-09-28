# chain.py NAME x0,y0,x1,y1[;...] cx,cy [exclude x0,y0,x1,y1]: chain-track a region backwards from 23.12 (frame to frame)
import cv2, numpy as np, math, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
name=sys.argv[1]; rects=[[int(v) for v in r.split(',')] for r in sys.argv[2].split(';')]; C=np.array([float(v) for v in sys.argv[3].split(',')]+[1.0])
ex=[int(v) for v in sys.argv[4].split(',')] if len(sys.argv)>4 else None
times=[round(23.12-0.04*i,2) for i in range(14)]
sift=cv2.SIFT_create(8000)
def maskFor(shape,M):
    m=np.zeros(shape,np.uint8)
    for x0,y0,x1,y1 in rects:
        q=cv2.transform(np.float32([[x0,y0],[x1,y0],[x1,y1],[x0,y1]]).reshape(-1,1,2),M[:2]).reshape(-1,2).astype(np.int32); cv2.fillPoly(m,[q],255)
    if ex:
        x0,y0,x1,y1=ex; q=cv2.transform(np.float32([[x0,y0],[x1,y0],[x1,y1],[x0,y1]]).reshape(-1,1,2),M[:2]).reshape(-1,2).astype(np.int32); cv2.fillPoly(m,[q],0)
    return m
M=np.eye(3); prev=grab(times[0]); kr,dr=sift.detectAndCompute(prev,maskFor(prev.shape,M))
for t in times[1:]:
    g=grab(t); k,d=sift.detectAndCompute(g,None)
    mm=cv2.BFMatcher().knnMatch(dr,d,k=2); good=[a for a,b in mm if a.distance<0.75*b.distance]
    A=np.float32([kr[x.queryIdx].pt for x in good]); B=np.float32([k[x.trainIdx].pt for x in good])
    Ms,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=3)
    M=np.vstack([Ms,[0,0,1]])@M
    s=math.hypot(M[0,0],M[1,0]); r=math.degrees(math.atan2(M[1,0],M[0,0])); p=M@C
    print(f"[{t:.2f}, {p[0]-C[0]:.0f}, {p[1]-C[1]:.0f}, {s:.3f}, {r:.2f}],  // inl {int(inl.sum())}/{len(good)}")
    prev=g; kr,dr=sift.detectAndCompute(prev,maskFor(g.shape,M))
