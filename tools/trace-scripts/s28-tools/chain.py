import cv2,numpy as np,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
t0=float(sys.argv[1]); t1=float(sys.argv[2]); y0=int(sys.argv[3]); y1=int(sys.argv[4])
xs=[int(v) for v in sys.argv[5:7]] if len(sys.argv)>6 else [0,2206]
c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t0*25)))
frames=[]
for i in range(int(round((t1-t0)*25))+1):
    ok,f=c.read(); frames.append(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY))
orb=cv2.ORB_create(4000)
bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
acc=0.0; accs=1.0
for i in range(1,len(frames)):
    a,b=frames[i-1],frames[i]
    m=np.zeros_like(a); m[y0:y1,xs[0]:xs[1]]=255
    ka,da=orb.detectAndCompute(a,m); kb,db=orb.detectAndCompute(b,m)
    if da is None or db is None: print('none'); continue
    mm=sorted(bf.match(da,db),key=lambda x:x.distance)[:600]
    A=np.float32([ka[x.queryIdx].pt for x in mm]); B=np.float32([kb[x.trainIdx].pt for x in mm])
    M,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=2)
    d=B-A; dx=np.median(d[inl.ravel()==1,0]); dy=np.median(d[inl.ravel()==1,1])
    s=np.hypot(M[0,0],M[1,0])
    acc+=dx; accs*=s
    print(f"{t0+i/25:.2f} dx={dx:6.1f} dy={dy:5.1f} s={s:.4f} acc={acc:7.1f} inl={int(inl.sum())}")
