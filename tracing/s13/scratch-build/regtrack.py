import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); fps=25
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*fps))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
t0=float(sys.argv[1]); times=[float(x) for x in sys.argv[2].split(',')]
regs=[[int(v) for v in r.split(':')] for r in sys.argv[3:]]
ref=grab(t0)
orb=cv2.ORB_create(5000); bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
for t in times:
    g=grab(t); k,d=orb.detectAndCompute(g,None)
    out=[]
    for r in regs:
        m=np.zeros_like(ref); m[r[1]:r[3],r[0]:r[2]]=255
        kr,dr=orb.detectAndCompute(ref,m)
        mm=sorted(bf.match(dr,d),key=lambda x:x.distance)[:600]
        A=np.float32([kr[x.queryIdx].pt for x in mm]); B=np.float32([k[x.trainIdx].pt for x in mm])
        M,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=3)
        cx,cy=(r[0]+r[2])/2,(r[1]+r[3])/2
        p=M@np.array([cx,cy,1])
        s=np.hypot(M[0,0],M[1,0]); rot=np.degrees(np.arctan2(M[1,0],M[0,0]))
        out.append(f"[{p[0]-cx:+6.1f},{p[1]-cy:+6.1f} s{s:.3f} r{rot:+.2f} n{int(inl.sum())}]")
    print(f"{t:.2f}",' '.join(out))
