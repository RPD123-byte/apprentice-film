import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
t0,t1,thr=float(sys.argv[1]),float(sys.argv[2]),int(sys.argv[3])
f0=int(round(t0*25)); f1=int(round(t1*25))
c.set(cv2.CAP_PROP_POS_FRAMES,f0)
for fi in range(f0,f1+1):
    ok,f=c.read(); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
    m=(cv2.GaussianBlur(g,(3,3),0)>thr).astype(np.uint8)
    n,l,st,cen=cv2.connectedComponentsWithStats(m)
    # biggest component within x 450..1500, y 350..946
    best=None
    for i in range(1,n):
        x,y,w,h,a=st[i]
        if a<2000: continue
        cx,cy=cen[i]
        if not(450<cx<1500 and 400<cy<900): continue
        if best is None or a>st[best,4]: best=i
    if best is None: print(fi/25,'none'); continue
    ys,xs=np.nonzero(l==best)
    mx,my=xs.mean(),ys.mean(); cxx=((xs-mx)**2).mean(); cyy=((ys-my)**2).mean(); cxy=((xs-mx)*(ys-my)).mean()
    ang=0.5*np.arctan2(2*cxy,cxx-cyy)
    x,y,w,h,a=st[best]
    print(f'{fi/25:.2f} c=({mx:.0f},{my:.0f}) bbox x{x}-{x+w} y{y}-{y+h} area {a} axis {ang:+.3f}')
