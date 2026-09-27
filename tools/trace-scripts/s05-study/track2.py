import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(1,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
REG={
 'bgL':[(0,0,300,330),(0,330,250,800),(240,90,690,215)],
 'bgM':[(690,0,1100,160),(930,160,1100,480),(1128,190,1300,500)],
 'lap':[(420,530,1030,700),(250,640,560,946)],
 'head':[(1270,0,1900,300)],
 'owl':[(1450,230,1700,620)],
 'back':[(1750,600,2080,946),(1250,700,1600,946)],
 'arm':[(1170,620,1450,780)],
}
ref=grab(float(sys.argv[1]))
sift=cv2.SIFT_create(6000)
kr,dr=sift.detectAndCompute(ref,None)
A0=np.float32([k.pt for k in kr])
bf=cv2.BFMatcher()
for t in [float(x) for x in sys.argv[2].split(',')]:
    g=grab(t); k,d=sift.detectAndCompute(g,None)
    ms=bf.knnMatch(dr,d,k=2)
    good=[m for m,n in ms if m.distance<0.8*n.distance]
    A=np.float32([kr[m.queryIdx].pt for m in good]); B=np.float32([k[m.trainIdx].pt for m in good])
    out=[]
    for name,rs in REG.items():
        sel=np.zeros(len(A),bool)
        for (x0,y0,x1,y1) in rs: sel|=(A[:,0]>=x0)&(A[:,0]<x1)&(A[:,1]>=y0)&(A[:,1]<y1)
        if sel.sum()<5: out.append(f"{name}:--"); continue
        M,inl=cv2.estimateAffinePartial2D(A[sel],B[sel],ransacReprojThreshold=4,maxIters=5000)
        if M is None: out.append(f"{name}:--"); continue
        s=np.hypot(M[0,0],M[1,0]); r=np.degrees(np.arctan2(M[1,0],M[0,0]))
        out.append(f"{name}:[{s:.4f},{r:+.2f},{M[0,2]:+.1f},{M[1,2]:+.1f}]n{int(inl.sum())}")
    print(f"{t:.2f} "+" ".join(out))
