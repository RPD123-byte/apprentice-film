import cv2,numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def g(f):
    c.set(1,f); ok,im=c.read(); return cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
ref=g(466)
# template: head incl. headphones; find its exact bright blob first
T0=ref[120:330,1500:1770].copy()
tc=np.array([135.0,105.0])  # template centre (x,y) within T0
FACE=[[16.12,1087,186],[16.2,1087,185],[16.3,1083,162],[16.4,1081,153],[16.5,1088,215],[16.6,1103,297],[16.7,1124,345],[16.8,1153,377],[16.9,1215,398],[17.0,1281,403],[17.2,1347,379],[17.4,1410,369],[17.6,1468,369],[17.8,1506,379],[18.0,1532,371],[18.2,1539,353],[18.4,1581,305],[18.6,1619,258],[18.8,1645,234],[19.0,1684,224],[19.12,1710,208]]
def pred(t):
    for i in range(1,len(FACE)):
        if t<=FACE[i][0]+1e-9:
            a,b=FACE[i-1],FACE[i]; u=(t-a[0])/(b[0]-a[0]); return a[1]+(b[1]-a[1])*u, a[2]+(b[2]-a[2])*u
    return FACE[-1][1],FACE[-1][2]
prev=None
for f in range(420,436):
    t=f/25; im=g(f)
    px,py=pred(t)
    best=None
    for sc in np.arange(0.66,0.95,0.04):
        for rot in np.arange(-0.85,-0.15,0.05):
            M=cv2.getRotationMatrix2D((float(tc[0]),float(tc[1])),float(np.degrees(-rot)),float(sc))
            Tw=cv2.warpAffine(T0,M,(T0.shape[1],T0.shape[0]))
            # crop the centre portion of the transformed template to avoid borders
            h,w=Tw.shape; cx,cy=int(tc[0]),int(tc[1]); hw=int(100*sc); hh=int(80*sc)
            Tc=Tw[cy-hh:cy+hh, cx-hw:cx+hw]
            x0=int(px-hw-200); y0=int(py-hh-200); x1=int(px+hw+200); y1=int(py+hh+200)
            x0=max(0,x0); y0=max(0,y0); x1=min(2206,x1); y1=min(946,y1)
            win=im[y0:y1,x0:x1]
            if win.shape[0]<Tc.shape[0] or win.shape[1]<Tc.shape[1]: continue
            r=cv2.matchTemplate(win,Tc,cv2.TM_CCOEFF_NORMED); _,mv,_,ml=cv2.minMaxLoc(r)
            if best is None or mv>best[0]: best=(mv,sc,rot,x0+ml[0]+hw,y0+ml[1]+hh)
    print(f"{t:.2f} score={best[0]:.2f} s={best[1]:.2f} rot={best[2]:+.2f} centre=({best[3]},{best[4]})  pred=({px:.0f},{py:.0f})",flush=True)
