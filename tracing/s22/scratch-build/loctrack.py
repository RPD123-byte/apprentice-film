from fr import seq, frame
import numpy as np, cv2, sys
ref=frame(76.0)
# name: (x0,y0,x1,y1) in frame coords
R={'head':(420,210,900,300),'plate':(660,300,880,355),'beanie':(1000,280,1130,355),'counter':(1770,222,1880,262),'key':(1760,265,1820,305),'plantR':(1860,240,1960,340),'below':(1000,380,1200,440)}
t0,t1,st=float(sys.argv[1]),float(sys.argv[2]),int(sys.argv[3]) if len(sys.argv)>3 else 1
for t,f in seq(t0,t1):
    if int(round(t*25))%st: continue
    s=f"{t:6.2f}"
    for n,(x0,y0,x1,y1) in R.items():
        T=ref[y0:y1,x0:x1]; p=60
        S=f[max(0,y0-p):y1+p,x0-p:x1+p]
        r=cv2.matchTemplate(S,T,cv2.TM_CCOEFF_NORMED); _,mv,_,ml=cv2.minMaxLoc(r)
        dx=ml[0]-p; dy=ml[1]-(y0-max(0,y0-p))
        s+=f" {n}:({dx:+3d},{dy:+3d}|{mv:.2f})"
    print(s)
