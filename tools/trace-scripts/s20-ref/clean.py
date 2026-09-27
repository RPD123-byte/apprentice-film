import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(1,int(round(t*25))); ok,f=c.read(); return f
fr=[grab(t) for t in np.arange(63.44,66.8,0.08)]
st=np.stack(fr).astype(np.float32)
p20=np.percentile(st,20,axis=0); med=np.median(st,axis=0)
cv2.imwrite('snapshots/s20-ref/clean1_p20.png',p20.astype(np.uint8))
cv2.imwrite('snapshots/s20-ref/clean1_med.png',med.astype(np.uint8))
fr2=[grab(t) for t in np.arange(68.0,69.38,0.08)]
st2=np.stack(fr2).astype(np.float32)
cv2.imwrite('snapshots/s20-ref/clean2_med.png',np.median(st2,axis=0).astype(np.uint8))
