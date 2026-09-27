# Owl head tracking: multi-scale template match of the owl's head (with headphones) from the 127.4 s frame.
import cv2, numpy as np, json, sys
from common import *
ref=load(127.4); x0,y0,x1,y1=1288,378,1518,552
T=ref[y0:y1,x0:x1]; hc=((x0+x1)/2,(y0+y1)/2)
out={}
prev=None
ts=[float(v) for v in sys.argv[1].split(',')] if len(sys.argv)>1 else times(125.4,129.28,0.04)
for t in ts:
    f=load(t); best=None
    scales=np.arange(0.25,1.25,0.02) if prev is None else np.arange(max(0.15,prev[2]-0.1),prev[2]+0.1,0.01)
    for s in scales:
        Ts=cv2.resize(T,None,fx=s,fy=s,interpolation=cv2.INTER_AREA)
        if Ts.shape[0]<12: continue
        if prev is not None:
            px,py=prev[0],prev[1]; r=int(120+200*s)
            X0,Y0=max(0,int(px-r-Ts.shape[1]/2)),max(0,int(py-r-Ts.shape[0]/2)); X1,Y1=min(2206,int(px+r+Ts.shape[1]/2)),min(946,int(py+r+Ts.shape[0]/2))
        else: X0,Y0,X1,Y1=900,0,2206,946
        roi=f[Y0:Y1,X0:X1]
        if roi.shape[0]<=Ts.shape[0] or roi.shape[1]<=Ts.shape[1]: continue
        R=cv2.matchTemplate(roi,Ts,cv2.TM_CCOEFF_NORMED); _,mv,_,ml=cv2.minMaxLoc(R)
        if best is None or mv>best[0]: best=(mv,X0+ml[0]+Ts.shape[1]/2,Y0+ml[1]+Ts.shape[0]/2,s)
    mv,cx,cy,s=best; out[str(t)]=[cx,cy,s,mv]; prev=(cx,cy,s)
    print(f"{t:.2f} cx={cx:.1f} cy={cy:.1f} s={s:.2f} score={mv:.3f}",flush=True)
json.dump(out,open('owl_head.json','w'))
