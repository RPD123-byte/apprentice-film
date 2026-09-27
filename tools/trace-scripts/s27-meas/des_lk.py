# Designer motion: LK tracks of good features on him, from t0 (125.0) forward/backward; per-frame affine + residual
import cv2, numpy as np, json, sys
from common import *
t0,t1=float(sys.argv[1]),float(sys.argv[2]); outfn=sys.argv[3]
g0=load(t0,True)
m=np.zeros_like(g0)
poly=np.int32([[0,250],[450,220],[620,90],[1000,110],[1080,420],[1040,690],[900,720],[760,800],[640,946],[0,946]])
cv2.fillPoly(m,[poly],255)
P0=cv2.goodFeaturesToTrack(g0,1500,0.01,10,mask=m)
P=P0.copy(); prev=g0; alive=np.ones(len(P),bool)
out={'t0':t0,'P0':P0.reshape(-1,2).tolist(),'tracks':{}}
step=0.04 if t1>t0 else -0.04
for t in times(t0,t1,0.04)[1:] if t1>t0 else [round(t0-0.04*i,2) for i in range(1,int(round((t0-t1)/0.04))+1)]:
    g=load(t,True)
    Q,st,_=cv2.calcOpticalFlowPyrLK(prev,g,P,None,winSize=(21,21),maxLevel=4)
    B,_,_=cv2.calcOpticalFlowPyrLK(g,prev,Q,None,winSize=(21,21),maxLevel=4)
    fb=np.linalg.norm((B-P).reshape(-1,2),axis=1); ok=(st.ravel()==1)&(fb<1.0)
    alive&=ok
    A=P0[alive].reshape(-1,2); C=Q[alive].reshape(-1,2)
    M,inl=cv2.estimateAffine2D(A,C,ransacReprojThreshold=3.0)
    r=np.linalg.norm((A@M[:,:2].T+M[:,2])-C,axis=1)
    out['tracks'][str(t)]={'alive':np.where(alive)[0].tolist(),'pts':C.round(2).tolist(),'M':M.tolist()}
    print(f"{t:.2f} n={alive.sum()} inl={int(inl.sum())} med_res={np.median(r):.1f} p90={np.percentile(r,90):.1f} M={np.round(M,3).ravel().tolist()}",flush=True)
    P=Q; prev=g
json.dump(out,open(outfn,'w'))
