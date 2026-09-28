# BG motion in the final orbit: LK on good features in the upper background, similarity/affine per frame vs t0.
import cv2, numpy as np, json, sys
from common import *
t0,t1=float(sys.argv[1]),float(sys.argv[2])
g0=load(t0,True)
m=np.zeros_like(g0); m[:330,:]=255; m[:,:0]=0
# exclude designer beanie region at t0 (x 580-1000, y 80-330) and owl
m[60:330,560:1080]=0
P0=cv2.goodFeaturesToTrack(g0,400,0.01,12,mask=m)
P=P0.copy(); prev=g0; alive=np.ones(len(P),bool)
out={}
for t in times(t0,t1,0.04)[1:]:
    g=load(t,True)
    Q,st,_=cv2.calcOpticalFlowPyrLK(prev,g,P,None,winSize=(25,25),maxLevel=4)
    B,st2,_=cv2.calcOpticalFlowPyrLK(g,prev,Q,None,winSize=(25,25),maxLevel=4)
    fb=np.linalg.norm((B-P).reshape(-1,2),axis=1); alive&=(st.ravel()==1)&(fb<1.0)
    A=P0[alive].reshape(-1,2); C=Q[alive].reshape(-1,2)
    M,inl=cv2.estimateAffine2D(A,C,ransacReprojThreshold=2.0)
    out[str(t)]=M.tolist()
    s=np.sqrt(abs(np.linalg.det(M[:,:2])))
    print(f"{t:.2f} n={alive.sum()} inl={int(inl.sum())} s={s:.3f} tx={M[0,2]:.1f} ty={M[1,2]:.1f} M={np.round(M[:,:2],3).ravel().tolist()}",flush=True)
    P=Q; prev=g
json.dump(out,open(sys.argv[3],'w'))
