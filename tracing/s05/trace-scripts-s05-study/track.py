import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); fps=25
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*fps))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
tref=float(sys.argv[1]); t0=float(sys.argv[2]); t1=float(sys.argv[3]); step=float(sys.argv[4])
REG={
 'bgL':(0,0,640,330),'spkL':(0,330,280,820),'boxes':(700,0,1250,200),'spkC':(1130,190,1320,500),
 'kbd':(430,560,1100,900),'head':(1270,0,1900,330),'owl':(1470,260,1760,660),'back':(1350,650,2150,946),
}
sift=cv2.SIFT_create(4000)
ref=grab(tref)
kr,dr=sift.detectAndCompute(ref,None)
pts=np.float32([k.pt for k in kr])
bf=cv2.BFMatcher()
t=t0
while t<=t1+1e-6:
    g=grab(t); k,d=sift.detectAndCompute(g,None)
    ms=bf.knnMatch(dr,d,k=2)
    good=[m for m,n in ms if m.distance<0.75*n.distance]
    A=np.float32([kr[m.queryIdx].pt for m in good]); B=np.float32([k[m.trainIdx].pt for m in good])
    out=[]
    for name,(x0,y0,x1,y1) in REG.items():
        sel=(A[:,0]>=x0)&(A[:,0]<x1)&(A[:,1]>=y0)&(A[:,1]<y1)
        if sel.sum()<6: out.append(f"{name}: --"); continue
        M,inl=cv2.estimateAffinePartial2D(A[sel],B[sel],ransacReprojThreshold=3)
        if M is None: out.append(f"{name}: --"); continue
        s=np.hypot(M[0,0],M[1,0]); r=np.degrees(np.arctan2(M[1,0],M[0,0]))
        cx,cy=(x0+x1)/2,(y0+y1)/2
        nx,ny=M@np.array([cx,cy,1])
        out.append(f"{name}: s{s:.3f} r{r:+.1f} d({nx-cx:+.0f},{ny-cy:+.0f}) n{int(inl.sum())}")
    print(f"{t:.2f} "+" | ".join(out)); t+=step
