# Mug body tracking by multi-scale template matching (template = mug body at 119.8, handle excluded); per frame the
# best (x, y, scale) near the previous estimate. Output: rim-centre x, rim y, scale (1 = 145 px body width).
import cv2, numpy as np, json, sys
from src import frame
T0=float(sys.argv[5]) if len(sys.argv)>5 else 119.8
g0=cv2.cvtColor(frame(T0),cv2.COLOR_BGR2GRAY).astype(np.float32)
tx0,ty0,tx1,ty1=[int(v) for v in sys.argv[6].split(",")] if len(sys.argv)>6 else (1590,536,1744,708)
tpl=g0[ty0:ty1,tx0:tx1]
cx0,cy0=(tx0+tx1)/2,(ty0+ty1)/2
t1=float(sys.argv[1]); t2=float(sys.argv[2]); step=float(sys.argv[3]); init=[float(v) for v in sys.argv[4].split(',')]
px,py,ps=init
res=[]
t=t1
while (t<=t2+1e-6 if step>0 else t>=t2-1e-6):
    g=cv2.cvtColor(frame(t),cv2.COLOR_BGR2GRAY).astype(np.float32)
    best=None
    for s in np.arange(ps-0.06,ps+0.061,0.01):
        tp=cv2.resize(tpl,None,fx=s,fy=s,interpolation=cv2.INTER_AREA)
        h,w=tp.shape; R=90
        x0=int(max(0,px-w/2-R)); y0=int(max(0,py-h/2-R)); x1=int(min(2206,px+w/2+R)); y1=int(min(946,py+h/2+R))
        if x1-x0<=w or y1-y0<=h: continue
        m=cv2.matchTemplate(g[y0:y1,x0:x1],tp,cv2.TM_CCOEFF_NORMED)
        _,v,_,loc=cv2.minMaxLoc(m)
        if best is None or v>best[0]: best=(v,x0+loc[0]+w/2,y0+loc[1]+h/2,s)
    v,x,y,s=best
    print(f"{t:.2f} score={v:.3f} cx={x:.1f} cy={y:.1f} s={s:.2f} rimY={y-(cy0-543)*s:.1f}",flush=True)
    res.append([round(t,2),round(x,1),round(y,1),round(s,3),round(v,3)])
    if v>0.6: px,py,ps=x,y,s
    t=round(t+step,3)
json.dump(res,open(f'../s27d-meas/mug_{t1}_{t2}.json','w'))
