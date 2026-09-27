# LK-track feature points through the source from T0 to T1 (frame by frame), forward-backward checked.
import cv2, numpy as np, sys, json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
T0,T1=float(sys.argv[1]),float(sys.argv[2]); out=sys.argv[3]
c=cv2.VideoCapture(V); fps=25
def grab(i):
    c.set(cv2.CAP_PROP_POS_FRAMES,i); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
i0,i1=int(round(T0*fps)),int(round(T1*fps))
frames=[grab(i) for i in range(i0,i1+1)]
g0=frames[0]
pts=cv2.goodFeaturesToTrack(g0,600,0.01,18,blockSize=9)
lk=dict(winSize=(31,31),maxLevel=4,criteria=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,30,0.01))
P=pts.reshape(-1,2).astype(np.float32); alive=np.ones(len(P),bool)
tracks=[P.copy()]
for k in range(1,len(frames)):
    a,b=frames[k-1],frames[k]
    p1,st,err=cv2.calcOpticalFlowPyrLK(a,b,P,None,**lk)
    p0r,st2,err2=cv2.calcOpticalFlowPyrLK(b,a,p1,None,**lk)
    fb=np.linalg.norm(p0r-P,axis=1)
    ok=(st.ravel()==1)&(st2.ravel()==1)&(fb<1.0)
    alive&=ok
    P=p1.reshape(-1,2); tracks.append(P.copy())
T=np.stack(tracks)  # frames x N x 2
json.dump({'t0':T0,'fps':fps,'alive':alive.tolist(),'tracks':T.round(1).tolist()},open(out,'w'))
print('alive',alive.sum(),'of',len(alive))
