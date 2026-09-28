import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); fps=c.get(5)
t0,t1=float(sys.argv[1]),float(sys.argv[2])
f0=int(round(t0*fps)); f1=int(round(t1*fps))
frames=[]
c.set(cv2.CAP_PROP_POS_FRAMES,f0)
for i in range(f0,f1+1):
    ok,f=c.read(); frames.append(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY))
g0=frames[0]
mask=np.full_like(g0,255)
# exclude owl region
mask[540:946,850:1350]=0
pts=cv2.goodFeaturesToTrack(g0,400,0.01,25,mask=mask)
tracks=[pts.reshape(-1,2)]
alive=np.ones(len(pts),bool)
p=pts
for i in range(1,len(frames)):
    q,st,err=cv2.calcOpticalFlowPyrLK(frames[i-1],frames[i],p,None,winSize=(31,31),maxLevel=4)
    # back check
    r,st2,_=cv2.calcOpticalFlowPyrLK(frames[i],frames[i-1],q,None,winSize=(31,31),maxLevel=4)
    fb=np.linalg.norm((r-p).reshape(-1,2),axis=1)
    alive&=(st.reshape(-1)==1)&(st2.reshape(-1)==1)&(fb<1.0)
    tracks.append(q.reshape(-1,2)); p=q
T=np.stack(tracks)  # frames x n x 2
np.save('tracks.npy',T[:,alive]); print('alive',alive.sum(),'of',len(alive),'frames',len(frames))
