import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); fps=c.get(5)
f0=int(round(48.72*fps)); f1=int(round(53.20*fps))
c.set(cv2.CAP_PROP_POS_FRAMES,f0)
fr=[]
for i in range(f0,f1+1):
    ok,f=c.read(); fr.append(cv2.GaussianBlur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY),(0,0),2).astype(np.float32))
A=np.stack(fr); sd=A.std(0)
m=(sd>12).astype(np.uint8)*255
cv2.imwrite('snapshots/s17-meas/tstd.png',np.clip(sd*6,0,255).astype(np.uint8))
n,lab,st,cen=cv2.connectedComponentsWithStats(m)
for i in range(1,n):
    if st[i,4]>150: print(st[i])
