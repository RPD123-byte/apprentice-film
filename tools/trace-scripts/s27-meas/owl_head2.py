import cv2, numpy as np, json, sys
from common import *
ref=load(127.4); x0,y0,x1,y1=1288,378,1518,552
T=ref[y0:y1,x0:x1]
def track(ts,start):
    out={}; prev=start
    for t in ts:
        f=load(t); best=None
        for s in np.arange(prev[2]*0.88,prev[2]*1.12,0.01):
            Ts=cv2.resize(T,None,fx=s,fy=s,interpolation=cv2.INTER_AREA)
            px,py=prev[0],prev[1]; r=int(60+120*prev[2])
            X0,Y0=max(0,int(px-r-Ts.shape[1]/2)),max(0,int(py-r-Ts.shape[0]/2)); X1,Y1=min(2206,int(px+r+Ts.shape[1]/2)),min(946,int(py+r+Ts.shape[0]/2))
            roi=f[Y0:Y1,X0:X1]
            if roi.shape[0]<=Ts.shape[0] or roi.shape[1]<=Ts.shape[1]: continue
            R=cv2.matchTemplate(roi,Ts,cv2.TM_CCOEFF_NORMED); _,mv,_,ml=cv2.minMaxLoc(R)
            if best is None or mv>best[0]: best=(mv,X0+ml[0]+Ts.shape[1]/2,Y0+ml[1]+Ts.shape[0]/2,s)
        mv,cx,cy,s=best; out[str(t)]=[round(cx,1),round(cy,1),round(s,3),round(mv,3)]; prev=(cx,cy,s)
        print(f"{t:.2f} cx={cx:.1f} cy={cy:.1f} s={s:.3f} score={mv:.3f}",flush=True)
    return out
c=((x0+x1)/2,(y0+y1)/2,1.0)
o1=track([round(127.4-0.04*i,2) for i in range(0,51)],c)
o2=track(times(127.4,129.28,0.04),c)
o1.update(o2); json.dump(o1,open('owl_head.json','w'))
