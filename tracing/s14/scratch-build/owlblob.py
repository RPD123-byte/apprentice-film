# owlblob.py T0 T1 [thr] [video|dir] : per-frame owl blob stats: centroid, area, bbox, left tip, right tip, bottom
import cv2, numpy as np, sys, glob, re
t0,t1=float(sys.argv[1]),float(sys.argv[2]); thr=int(sys.argv[3]) if len(sys.argv)>3 else 150
src=sys.argv[4] if len(sys.argv)>4 else None
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
def frames():
    if src:
        fs=sorted(glob.glob(src+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
        for f in fs:
            t=float(re.search(r'at-([\d.]+)s',f).group(1))
            if t0-1e-6<=t<=t1+1e-6: yield t,cv2.imread(f)
    else:
        c=cv2.VideoCapture(V)
        n0,n1=int(round(t0*25)),int(round(t1*25))
        c.set(cv2.CAP_PROP_POS_FRAMES,n0)
        for n in range(n0,n1+1):
            ok,f=c.read(); yield n/25,f
prev=None
for t,f in frames():
    g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
    m=(g>thr).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m)
    # the owl = largest component whose centroid is in the lower-left-middle region
    best=None
    for i in range(1,n):
        x,y,w,h,a=st[i]
        if a<3000: continue
        if best is None or a>st[best][4]: best=i
    x,y,w,h,a=st[best]; cx,cy=cen[best]
    ys,xs=np.where(lab==best)
    il=np.argmin(xs); ir=np.argmax(xs); ib=np.argmax(ys)
    print(f"{t:6.2f} c=({cx:6.1f},{cy:6.1f}) A={a:6d} bbox=({x},{y},{x+w},{y+h}) L=({xs[il]},{ys[il]}) R=({xs[ir]},{ys[ir]}) B=({xs[ib]},{ys[ib]})")
