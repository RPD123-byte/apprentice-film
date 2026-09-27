import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); fps=c.get(5)
f0=int(round(48.64*fps)); f1=int(round(53.20*fps))
c.set(cv2.CAP_PROP_POS_FRAMES,f0)
X0,Y0,X1,Y1=300,250,1050,640
fr=[]
for i in range(f0,f1+1):
    ok,f=c.read(); fr.append(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)[Y0:Y1,X0:X1])
A=np.stack(fr).astype(np.float32)
med=np.median(A,0)
cv2.imwrite('snapshots/s17-meas/median.png',med.astype(np.uint8))
np.save('snapshots/s17-meas/frames.npy',A)
np.save('snapshots/s17-meas/median.npy',med)
out=[]
for k in range(len(fr)):
    t=(f0+k)/fps
    d=np.abs(cv2.GaussianBlur(A[k],(0,0),1.5)-cv2.GaussianBlur(med,(0,0),1.5))
    m=((d>28)&(A[k]>120)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m)
    if n<2: print(t,'none'); continue
    big=np.argmax(st[1:,4])+1
    ys,xs=np.nonzero(lab==big)
    # also union of comps > 80 px
    keep=[i for i in range(1,n) if st[i,4]>80]
    mm=np.isin(lab,keep)
    ys,xs=np.nonzero(mm)
    x0,x1,y0,y1=xs.min()+X0,xs.max()+X0,ys.min()+Y0,ys.max()+Y0
    print(f"{t:.2f} bbox x {x0}-{x1} y {y0}-{y1}  cen {xs.mean()+X0:.0f},{ys.mean()+Y0:.0f} area {len(xs)}")
    cv2.imwrite(f'snapshots/s17-meas/m_{t:.2f}.png',(mm*255).astype(np.uint8))
