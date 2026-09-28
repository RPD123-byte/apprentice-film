import cv2, numpy as np, json, sys
from common import *
t0,t1=float(sys.argv[1]),float(sys.argv[2]); roi=[int(v) for v in sys.argv[3:7]]; outfn=sys.argv[7]
mode=sys.argv[8] if len(sys.argv)>8 else 'H'
g0=load(t0,True); m=np.zeros_like(g0); m[roi[1]:roi[3],roi[0]:roi[2]]=255
P0=cv2.goodFeaturesToTrack(g0,600,0.005,10,mask=m)
P=P0.copy(); prev=g0; alive=np.ones(len(P),bool); out={}
for t in times(t0,t1,0.04)[1:]:
    g=load(t,True)
    Q,st,_=cv2.calcOpticalFlowPyrLK(prev,g,P,None,winSize=(31,31),maxLevel=4)
    B,_,_=cv2.calcOpticalFlowPyrLK(g,prev,Q,None,winSize=(31,31),maxLevel=4)
    fb=np.linalg.norm((B-P).reshape(-1,2),axis=1); alive&=(st.ravel()==1)&(fb<1.0)&(Q.reshape(-1,2)[:,0]>0)&(Q.reshape(-1,2)[:,0]<2206)
    A=P0[alive].reshape(-1,2); C=Q[alive].reshape(-1,2)
    if len(A)<8: print(t,'lost'); break
    if mode=='H': M,inl=cv2.findHomography(A,C,cv2.RANSAC,2.0)
    else:
        M,inl=cv2.estimateAffine2D(A,C,ransacReprojThreshold=2.0); M=np.vstack([M,[0,0,1]])
    out[str(t)]=(M/M[2,2]).tolist()
    if round(t*25)%5==0:
        c=cv2.perspectiveTransform(np.float32([[[roi[0],roi[1]]],[[roi[2],roi[1]]],[[roi[2],roi[3]]],[[roi[0],roi[3]]]]),M).reshape(-1,2)
        print(f"{t:.2f} n={alive.sum()} inl={int(inl.sum())} "+" ".join(f"({x:.0f},{y:.0f})" for x,y in c),flush=True)
    P=Q; prev=g
json.dump(out,open(outfn,'w'))
