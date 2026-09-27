# gstrip.py T0 T1 STEP out.jpg x0 y0 x1 y1 [--cols N] [--w W]: strip with a 50px frame grid drawn in
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
a=sys.argv[1:]; cols=6; tw=300
if '--cols' in a: i=a.index('--cols'); cols=int(a[i+1]); del a[i:i+2]
if '--w' in a: i=a.index('--w'); tw=int(a[i+1]); del a[i:i+2]
t0,t1,st=map(float,a[:3]); out=a[3]; x0,y0,x1,y1=map(int,a[4:8])
c=cv2.VideoCapture(V); tiles=[]; t=t0
while t<=t1+1e-6:
    c.set(1,int(round(t*25))); ok,f=c.read()
    for x in range(0,f.shape[1],50): cv2.line(f,(x,0),(x,f.shape[0]),(0,200,255) if x%100 else (0,0,255),1)
    for y in range(0,f.shape[0],50): cv2.line(f,(0,y),(f.shape[1],y),(0,200,255) if y%100 else (0,0,255),1)
    f=f[y0:y1,x0:x1]; th=int(f.shape[0]*tw/f.shape[1]); f=cv2.resize(f,(tw,th),interpolation=cv2.INTER_AREA)
    cv2.putText(f,f"{t:.2f}",(4,16),0,0.5,(0,255,0),1); tiles.append(f); t+=st
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,88])
