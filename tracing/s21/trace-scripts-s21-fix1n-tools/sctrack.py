#!/usr/bin/env python3
# sctrack.py T0 T1 refT rx ry [x y] : track the scissors' pivot screw frame by frame with a rotated template from refT
# (centred on the screw at rx, ry). Prints t, x, y, rotation (rad, + = clockwise in image), score.
import cv2, sys, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def fr(t): c.set(1,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
t0,t1,rt,rx,ry=[float(v) for v in sys.argv[1:6]]
hw,hh=int(sys.argv[6]) if len(sys.argv)>6 else 22, int(sys.argv[7]) if len(sys.argv)>7 else 14
ref=fr(rt)
# template: a rotated window centred on the screw (patch big enough to rotate)
R=int(np.hypot(hw,hh))+2
big=ref[int(ry)-R:int(ry)+R+1,int(rx)-R:int(rx)+R+1]
tpls=[]
for a in np.arange(-2.2,1.201,0.03):
    M=cv2.getRotationMatrix2D((R+(rx-int(rx)),R+(ry-int(ry))),np.degrees(-a),1.0)
    rot=cv2.warpAffine(big,M,(2*R+1,2*R+1),flags=cv2.INTER_LINEAR)
    tp=rot[R-hh:R+hh+1,R-hw:R+hw+1]
    tpls.append((a,tp))
px,py=rx,ry; pa=0.0
F0,F1=int(round(t0*25)),int(round(t1*25))
step=1 if F1>=F0 else -1
for F in range(int(round(rt*25)),F1+step,step) if False else []: pass
def run(frames):
    global px,py,pa
    x,y,a=rx,ry,0.0
    out=[]
    for F in frames:
        im=fr(F/25)
        S=40
        x0,y0=int(x)-S-hw,int(y)-S-hh
        win=im[max(0,y0):y0+2*S+2*hh+1,max(0,x0):x0+2*S+2*hw+1]
        best=(-2,0,0,0)
        for aa,tp in tpls:
            if abs(aa-a)>0.25: continue
            if win.shape[0]<tp.shape[0] or win.shape[1]<tp.shape[1]: continue
            r=cv2.matchTemplate(win,tp,cv2.TM_CCOEFF_NORMED)
            _,mv,_,ml=cv2.minMaxLoc(r)
            if mv>best[0]: best=(mv,ml[0]+hw+max(0,x0),ml[1]+hh+max(0,y0),aa)
        sc,x,y,a=best
        out.append((F/25,x,y,a,sc))
    return out
rF=int(round(rt*25))
res=run(range(rF,F1+1))+run(range(rF-1,F0-1,-1))
for t,x,y,a,sc in sorted(res):
    print(f'{t:6.2f} {x:6.1f} {y:6.1f} {a:+.2f} {sc:.2f}')
