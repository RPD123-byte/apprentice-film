# Track named points frame to frame with pyramidal LK (forward from t0 to t1, step 0.04). Usage in python:
#   tracks=track({'name':(x,y),...}, t0, t1)  -> {name: {t:(x,y,status)}}
import cv2, numpy as np, json, sys
from common import *
def track(pts, t0, t1, win=31, level=4):
    names=list(pts); P=np.float32([pts[n] for n in names]).reshape(-1,1,2)
    step=0.04 if t1>=t0 else -0.04
    n=int(round(abs(t1-t0)/0.04))
    out={k:{} for k in names}
    prev=load(t0,True)
    alive=np.ones(len(names),bool)
    for k,nm in enumerate(names): out[nm][round(t0,2)]=(float(P[k,0,0]),float(P[k,0,1]),1)
    for i in range(1,n+1):
        t=round(t0+i*step,2); g=load(t,True)
        Q,st,err=cv2.calcOpticalFlowPyrLK(prev,g,P,None,winSize=(win,win),maxLevel=level,criteria=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,40,0.01))
        B,st2,_=cv2.calcOpticalFlowPyrLK(g,prev,Q,None,winSize=(win,win),maxLevel=level)
        fb=np.linalg.norm((B-P).reshape(-1,2),axis=1)
        ok=(st.ravel()==1)&(fb<1.5)
        alive&=ok
        for k,nm in enumerate(names): out[nm][t]=(float(Q[k,0,0]),float(Q[k,0,1]),int(alive[k]))
        P=Q; prev=g
    return out
def show(tracks, ts, fn, crop=None, w=440, cols=5):
    tiles=[]
    for t in ts:
        f=load(t).copy()
        for nm,tr in tracks.items():
            if t in tr:
                x,y,a=tr[t]; c=(0,255,0) if a else (0,0,255)
                cv2.circle(f,(int(round(x)),int(round(y))),6,c,2); cv2.putText(f,nm,(int(x)+7,int(y)-7),0,0.6,c,2)
        if crop: f=f[crop[1]:crop[3],crop[0]:crop[2]]
        f=cv2.resize(f,(w,int(f.shape[0]*w/f.shape[1])),interpolation=cv2.INTER_AREA)
        cv2.putText(f,f"{t:.2f}",(4,16),0,0.5,(0,255,255),1); tiles.append(f)
    while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
    cv2.imwrite(fn,np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]))
