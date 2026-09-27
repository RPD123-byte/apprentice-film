# Track given seed points (x,y) from T0 to T1 (forward) or backward if T1<T0; prints per-frame positions and fb error.
import cv2, numpy as np, sys, json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
T0,T1=float(sys.argv[1]),float(sys.argv[2]); seeds=json.loads(sys.argv[3]); win=int(sys.argv[4]) if len(sys.argv)>4 else 41
c=cv2.VideoCapture(V)
def grab(i):
    c.set(cv2.CAP_PROP_POS_FRAMES,i); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
i0,i1=int(round(T0*25)),int(round(T1*25)); st=1 if i1>=i0 else -1
idx=list(range(i0,i1+st,st)); frames=[grab(i) for i in idx]
lk=dict(winSize=(win,win),maxLevel=4,criteria=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,40,0.01))
P=np.float32(seeds); out=[P.copy()]; errs=[np.zeros(len(P))]
for k in range(1,len(frames)):
    p1,s1,_=cv2.calcOpticalFlowPyrLK(frames[k-1],frames[k],P,None,**lk)
    pb,s2,_=cv2.calcOpticalFlowPyrLK(frames[k],frames[k-1],p1,None,**lk)
    errs.append(np.linalg.norm(pb-P,axis=1)); P=p1; out.append(P.copy())
res={'t':[i/25 for i in idx],'pts':np.array(out).round(1).tolist(),'fb':np.array(errs).round(2).tolist()}
json.dump(res,open(sys.argv[5] if len(sys.argv)>5 else 'seed.json','w'))
for k,t in enumerate(res['t']):
    print(f"{t:.2f} "+' '.join(f"{p[0]:6.0f},{p[1]:4.0f}({e:.1f})" for p,e in zip(res['pts'][k],res['fb'][k])))
