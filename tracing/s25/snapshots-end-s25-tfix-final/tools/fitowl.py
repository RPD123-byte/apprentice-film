# fitowl.py: search scale/rotation/position of the dive drawing (rendered alone, ../end-s25-tfix-dbg/1.png, head anchor
# (776,430)) on source frames by normalized cross-correlation of blurred grayscale (numbers only)
import cv2, numpy as np, sys
M='/Users/computer/rootline/apprentice-film/snapshots/end-s25-tfix-meas'
D=cv2.cvtColor(cv2.imread('../end-s25-tfix-dbg/1.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
x0,y0,x1,y1=505,262,1040,640; T0=D[y0:y1,x0:x1]; ax,ay=776-x0,430-y0
import os
if os.environ.get('MIR'): T0=T0[:,::-1].copy(); ax=T0.shape[1]-1-ax
for f in [int(v) for v in sys.argv[1].split(',')]:
    S=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f'{M}/src_{f:05d}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),3)
    RX,RY=int(sys.argv[2]),int(sys.argv[3]); S=S[RY:int(sys.argv[5]),RX:int(sys.argv[4])]
    best=None
    for sc in np.arange(float(os.environ.get("S0",0.8)),float(os.environ.get("S1",2.2)),0.05):
        for rot in np.arange(-0.5,0.21,0.05):
            h,w=T0.shape; c=np.cos(rot); s=np.sin(rot)
            # rotate/scale about the anchor, into a canvas big enough
            Wc,Hc=int(w*sc*1.5)+40,int(h*sc*1.5)+40
            Mx=np.array([[sc*c,-sc*s,0],[sc*s,sc*c,0]],np.float32)
            p=Mx[:, :2]@np.array([ax,ay]); Mx[0,2]=Wc/2-p[0]; Mx[1,2]=Hc/2-p[1]
            T=cv2.warpAffine(T0,Mx,(Wc,Hc)); A=cv2.warpAffine(np.ones_like(T0),Mx,(Wc,Hc))
            ys,xs=np.nonzero(A>0.5); bx0,bx1,by0,by1=xs.min(),xs.max(),ys.min(),ys.max()
            T=cv2.GaussianBlur(T,(0,0),3)[by0:by1,bx0:bx1]
            if T.shape[0]>=S.shape[0] or T.shape[1]>=S.shape[1]: continue
            r=cv2.matchTemplate(S,T,cv2.TM_CCOEFF_NORMED); _,mv,_,ml=cv2.minMaxLoc(r)
            if best is None or mv>best[0]: best=(mv,sc,rot,RX+ml[0]+Wc/2-bx0,RY+ml[1]+Hc/2-by0)
    print(f, 'ncc %.3f scale %.2f rot %.2f head (%.0f, %.0f)'%best)
