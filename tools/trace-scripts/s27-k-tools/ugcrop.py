# ugcrop.py T out.jpg x0 y0 x1 y1 [--render dir] [--enh lo hi] : ungraded (pre-grade) source crop, optional render below,
# optional contrast stretch of L (lo..hi in L 0..100) to reveal soft light/shadow shapes; grid every 50 px (labels /100)
import cv2, sys, numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/f2k-tools')
from common import load
from ungrade import ungrade
a=sys.argv[1:]; t=float(a[0]); out=a[1]; x0,y0,x1,y1=map(int,a[2:6]); rest=a[6:]
rdir=None; enh=None; sig=0
while rest:
    k=rest.pop(0)
    if k=='--render': rdir=rest.pop(0)
    elif k=='--enh': enh=(float(rest.pop(0)),float(rest.pop(0)))
    elif k=='--blur': sig=float(rest.pop(0))
ims=[ungrade(load(t),t)]
if rdir: ims.append(ungrade(cv2.imread(f'{rdir}/r-{t:.2f}.png'),t))
outs=[]
for im in ims:
    c=im[y0:y1,x0:x1].copy()
    if sig: c=cv2.GaussianBlur(c,(0,0),sig)
    if enh:
        L=cv2.cvtColor(c,cv2.COLOR_BGR2LAB); L[...,0]=np.clip((L[...,0]-enh[0])/(enh[1]-enh[0])*100,0,100); c=cv2.cvtColor(L,cv2.COLOR_LAB2BGR)
    c=np.clip(c*255,0,255).astype(np.uint8)
    for x in range((x0//50+1)*50,x1,50):
        cv2.line(c,(x-x0,0),(x-x0,c.shape[0]),(0,160,220) if x%100==0 else (0,90,130),1)
        if x%100==0: cv2.putText(c,str(x),(x-x0+2,12),0,0.4,(0,255,255),1)
    for y in range((y0//50+1)*50,y1,50):
        cv2.line(c,(0,y-y0),(c.shape[1],y-y0),(0,160,220) if y%100==0 else (0,90,130),1)
        if y%100==0: cv2.putText(c,str(y),(2,y-y0-2),0,0.4,(0,255,255),1)
    outs.append(c)
im=np.vstack(outs) if (x1-x0)>(y1-y0) else np.hstack(outs)
cv2.imwrite(out,im)
