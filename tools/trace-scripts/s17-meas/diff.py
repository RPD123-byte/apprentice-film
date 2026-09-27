import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); fps=c.get(5)
f0=int(round(47.84*fps)); f1=int(round(53.28*fps))
c.set(cv2.CAP_PROP_POS_FRAMES,f0)
prev=None
for i in range(f0,f1+1):
    ok,f=c.read()
    g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
    roi=g[300:620,350:1000]
    full=g
    if prev is not None:
        d=np.abs(roi-prev[300:620,350:1000]).mean(); dfull=np.abs(full-prev).mean()
        # bright region bbox (owl) : threshold
        print(f"{i/fps:.2f} droi={d:5.2f} dfull={dfull:5.2f}")
    prev=g
