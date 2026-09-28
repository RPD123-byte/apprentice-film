# layertrack.py: similarity of regions of source frames t (vs a reference time) — per depth layer
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
tref=float(sys.argv[1]); times=[float(x) for x in sys.argv[2].split(',')]
REG={'room':[(0,0,1450,260),(1900,0,2206,600)],'desk':[(0,280,1450,946)],'fig':[(1450,0,2206,946)],'owl':[(1560,300,1850,700)]}
ref=grab(tref)
sift=cv2.SIFT_create(6000)
for name,rects in REG.items():
    m=np.zeros_like(ref)
    for x0,y0,x1,y1 in rects: m[y0:y1,x0:x1]=255
    if name=='fig': m[300:700,1560:1850]=0
    kr,dr=sift.detectAndCompute(ref,m)
    out=[]
    for t in times:
        g=grab(t); k,d=sift.detectAndCompute(g,None)
        bf=cv2.BFMatcher(); mm=bf.knnMatch(dr,d,k=2)
        good=[a for a,b in mm if a.distance<0.75*b.distance]
        A=np.float32([kr[x.queryIdx].pt for x in good]); B=np.float32([k[x.trainIdx].pt for x in good])
        M,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=4)
        if M is None: out.append((t,None)); continue
        s=np.hypot(M[0,0],M[1,0]); r=np.degrees(np.arctan2(M[1,0],M[0,0]))
        res=np.abs((A@M[:,:2].T+M[:,2])-B)[inl.ravel()==1].mean() if inl.sum() else -1
        out.append((t,(s,r,M[0,2],M[1,2],int(inl.sum()),len(good),res)))
    for t,v in out:
        if v is None: print(name,t,'none'); continue
        print(f"{name:5s} {t:.2f} s={v[0]:.4f} rot={v[1]:+.2f} tx={v[2]:8.1f} ty={v[3]:8.1f} inl={v[4]}/{v[5]} res={v[6]:.2f}")
