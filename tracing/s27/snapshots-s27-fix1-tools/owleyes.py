# locate the owl's two eyes (dark round irises on the white disc) in source frames: prints eye centres, midpoint, spacing
import cv2, numpy as np, sys
from src import frame
DXMIN=int(__import__("os").environ.get("DXMIN","30"))
AMIN=int(__import__("os").environ.get("AMIN","120"))
def eyes(t, box):
    x0,y0,x1,y1=box; f=frame(t)[y0:y1,x0:x1]
    g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY); hsv=cv2.cvtColor(f,cv2.COLOR_BGR2HSV)
    m=((g<110)&(hsv[...,1]>40)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m)
    c=[]
    for i in range(1,n):
        x,y,w,h,a=st[i]
        if a<AMIN or a>3000: continue
        if not(0.6<w/max(h,1)<1.6): continue
        fill=a/(w*h)
        if fill<0.5: continue
        c.append((cen[i][0]+x0,cen[i][1]+y0,(w+h)/4,a))
    best=None
    for i in range(len(c)):
        for j in range(len(c)):
            if i==j: continue
            a,b=c[i],c[j]
            if not(a[0]<b[0]): continue
            dx=b[0]-a[0]; dy=abs(b[1]-a[1])
            if DXMIN<dx<95 and dy<25 and abs(a[2]-b[2])<8:
                sc=a[3]+b[3]
                if best is None or sc>best[0]: best=(sc,a,b)
    return best
for t in [float(v) for v in sys.argv[2].split(',')]:
    box=[int(v) for v in sys.argv[1].split(',')]
    b=eyes(t,box)
    if not b: print(f"{t:.2f} none"); continue
    _,a,c=b
    print(f"{t:.2f} L({a[0]:.0f},{a[1]:.0f}) r{a[2]:.0f}  R({c[0]:.0f},{c[1]:.0f}) r{c[2]:.0f}  mid ({(a[0]+c[0])/2:.0f},{(a[1]+c[1])/2:.0f}) spacing {c[0]-a[0]:.0f}")
