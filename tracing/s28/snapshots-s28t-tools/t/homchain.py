# Chain frame-to-frame homographies of a planar layer from the final frame (131.36) back to t0, using DIS flow + RANSAC.
# region: y range and optional x exclusion per call. Output JSON {t: H (maps FINAL coords -> frame t coords)}.
import cv2,numpy as np,sys,json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
name=sys.argv[1]; y0=int(sys.argv[2]); y1=int(sys.argv[3]); ex=[int(v) for v in sys.argv[4:]]
c=cv2.VideoCapture(V)
T0=129.2; TF=131.40
n0=int(round(T0*25)); nF=int(round(TF*25))
c.set(cv2.CAP_PROP_POS_FRAMES,n0)
fr={}
for n in range(n0,nF+1):
    ok,f=c.read(); fr[n]=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
Hs={nF:np.eye(3)}
H=np.eye(3)
gy,gx=np.mgrid[y0:y1:6,4:2202:6]
pts=np.stack([gx.ravel(),gy.ravel()],1).astype(np.float32)
for n in range(nF,n0,-1):
    a=fr[n]; b=fr[n-1]
    if np.abs(a.astype(float)-b.astype(float)).mean()<5:  # duplicate frame
        Hs[n-1]=H.copy(); print(f"{(n-1)/25:.2f} dup"); continue
    fl=dis.calc(a,b,None)
    P=pts.copy()
    # exclusions: list of x0 x1 pairs in frame n coordinates
    keep=np.ones(len(P),bool)
    for i in range(0,len(ex),2): keep&=~((P[:,0]>=ex[i])&(P[:,0]<ex[i+1]))
    P=P[keep]
    Q=P+fl[P[:,1].astype(int),P[:,0].astype(int)]
    Hstep,inl=cv2.findHomography(P,Q,cv2.RANSAC,1.0,maxIters=5000)
    H=Hstep@H
    H/=H[2,2]
    Hs[n-1]=H.copy()
    # report motion of a few final-frame points
    def m(x,y):
        v=H@np.array([x,y,1.0]); return v[:2]/v[2]
    print(f"{(n-1)/25:.2f} inl={inl.mean():.2f} p(200,100)->{m(200,100).round(1)} p(1800,100)->{m(1800,100).round(1)} p(1800,500)->{m(1800,500).round(1)}")
json.dump({f"{n/25:.2f}":Hs[n].tolist() for n in Hs},open(f'snapshots/s28t-tools/t/H_{name}.json','w'))
