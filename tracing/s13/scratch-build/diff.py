import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); fps=25
def grab(i):
    c.set(cv2.CAP_PROP_POS_FRAMES,i); ok,f=c.read(); return f
fr=[grab(i) for i in range(round(29.04*25), round(30.56*25))]
g=[cv2.GaussianBlur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),3) for f in fr]
acc=np.zeros_like(g[0])
for i in range(1,len(g)):
    d=np.abs(g[i]-g[i-1]); acc=np.maximum(acc,d)
    # regions
    ys,xs=np.where(d>12)
    if len(xs): print(i, 29.04+i*0.04, len(xs), xs.min(),xs.max(),ys.min(),ys.max())
    else: print(i, 29.04+i*0.04, 0)
m=np.clip(acc*4,0,255).astype(np.uint8)
cv2.imwrite('snapshots/s07-ref/motionmax.jpg', cv2.addWeighted(fr[0],0.5,cv2.cvtColor(m,cv2.COLOR_GRAY2BGR),1,0))
