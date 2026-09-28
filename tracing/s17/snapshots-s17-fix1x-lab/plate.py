# median of source frames 48.80–50.40 (owl-free outside the owl's box): a measurement plate (never used by the render)
import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); fs=[]
for k in range(21):
    t=48.80+0.08*k; c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); fs.append(f)
m=np.median(np.stack(fs),axis=0).astype(np.uint8)
cv2.imwrite('plate.png',m)
