# Chain the designer control grid through dense DIS optical flow, frame to frame (t0 -> t1).
import cv2, numpy as np, json, sys
from common import *
d=json.load(open('des_ctrl.json')); G=np.array(d['grid'],float)
t0,t1=float(sys.argv[1]),float(sys.argv[2]); outfn=sys.argv[3]
P=np.array(d['frames'][str(t0)],float)
dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
dis.setFinestScale(1); dis.setPatchSize(12); dis.setPatchStride(4)
prev=load(t0,True); out={str(t0):P.round(1).tolist()}
step=0.04 if t1>t0 else -0.04; n=int(round(abs(t1-t0)/0.04))
for i in range(1,n+1):
    t=round(t0+i*step,2); cur=load(t,True)
    fl=dis.calc(prev,cur,None)
    Q=P.copy()
    for k,(x,y) in enumerate(P):
        xi,yi=int(round(x)),int(round(y))
        if 3<=xi<2203 and 3<=yi<943:
            v=fl[yi-3:yi+4,xi-3:xi+4].reshape(-1,2); Q[k]=P[k]+np.median(v,0)
        # off-frame points: move with the mean of nearby in-frame points
    inb=(P[:,0]>=3)&(P[:,0]<2203)&(P[:,1]>=3)&(P[:,1]<943)
    for k in np.where(~inb)[0]:
        dd=np.hypot(*(P[inb]-P[k]).T); w=np.exp(-dd/200); Q[k]=P[k]+((Q[inb]-P[inb])*w[:,None]).sum(0)/w.sum()
    P=Q; prev=cur; out[str(t)]=P.round(1).tolist()
    print(t, 'mean move', np.round(np.mean(Q-P,0),1), flush=True) if False else None
json.dump(out,open(outfn,'w')); print('ok',len(out))
