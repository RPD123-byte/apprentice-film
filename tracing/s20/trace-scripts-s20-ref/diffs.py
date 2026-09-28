import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); fps=c.get(5)
f0=int(round(62.9*fps)); f1=int(round(69.6*fps))
c.set(cv2.CAP_PROP_POS_FRAMES,f0)
prev=None
for f in range(f0,f1+1):
    ok,im=c.read(); g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32)
    if prev is not None:
        d=np.abs(g-prev); m=d>20
        ys,xs=np.nonzero(m)
        bb=(xs.min(),ys.min(),xs.max(),ys.max()) if len(xs)>50 else None
        print(f"{f/fps:6.2f} mad={d.mean():6.2f} changed={m.mean()*100:5.2f}% bbox={bb} mean={g.mean():.1f}")
    prev=g
