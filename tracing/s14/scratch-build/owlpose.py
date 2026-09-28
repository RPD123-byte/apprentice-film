# owlpose.py T0 T1 [thr] [dir] : per-frame measurements of the owl from behind, normalised by s = sqrt(A/A0)
import cv2, numpy as np, sys, glob, re
t0,t1=float(sys.argv[1]),float(sys.argv[2]); thr=int(sys.argv[3]) if len(sys.argv)>3 else 150
src=sys.argv[4] if len(sys.argv)>4 and sys.argv[4]!='-' else None
A0=float(sys.argv[5]) if len(sys.argv)>5 else 40486
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
def frames():
    if src:
        fs=sorted(glob.glob(src+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
        for f in fs:
            t=float(re.search(r'at-([\d.]+)s',f).group(1))
            if t0-1e-6<=t<=t1+1e-6: yield t,cv2.imread(f)
    else:
        c=cv2.VideoCapture(V); n0,n1=int(round(t0*25)),int(round(t1*25)); c.set(cv2.CAP_PROP_POS_FRAMES,n0)
        for n in range(n0,n1+1):
            ok,f=c.read(); yield n/25,f
print("   t     s    top  headX headW  lowX  Lx   Ly    Rx   Ry   Bx   By   bot")
for t,f in frames():
    g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY); m=(g>thr).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m)
    best=max(range(1,n),key=lambda i:st[i][4]); x,y,w,h,a=st[best]; cx,cy=cen[best]
    M=(lab==best); ys,xs=np.where(M); s=np.sqrt(a/A0)
    top=y; bot=y+h
    hr=M[int(top+15*s):int(top+65*s)]; hx=np.where(hr)[1]
    headX=hx.mean(); headW=np.percentile(hx,98)-np.percentile(hx,2)
    lr=M[int(bot-85*s):int(bot-55*s)]; lx=np.where(lr)[1]; lowX=lx.mean()
    il=np.argmin(xs); ir=np.argmax(xs); ib=np.argmax(ys)
    r=lambda v,c0: (v-c0)/s
    print(f"{t:6.2f} {s:5.3f} {top:5d} {headX:6.1f} {headW/s:5.1f} {r(lowX,headX):5.1f} {r(xs[il],headX):5.0f} {r(ys[il],top):4.0f} {r(xs[ir],headX):5.0f} {r(ys[ir],top):4.0f} {r(xs[ib],headX):4.0f} {r(ys[ib],top):4.0f} {cx:6.1f} {cy:6.1f}")
