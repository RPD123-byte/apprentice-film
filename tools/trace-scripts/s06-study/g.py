#!/usr/bin/env python3
# crop grid: g.py T out x0 y0 x1 y1 step zoom
import cv2, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
t=float(sys.argv[1]); out=sys.argv[2]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]
step=int(sys.argv[7]) if len(sys.argv)>7 else 25; z=float(sys.argv[8]) if len(sys.argv)>8 else 2
c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*c.get(5)))); ok,f=c.read()
f=f[y0:y1,x0:x1]; f=cv2.resize(f,None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
for x in range((x0//step+1)*step,x1,step):
    X=int((x-x0)*z); col=(0,0,255) if x%100==0 else (0,180,255)
    cv2.line(f,(X,0),(X,f.shape[0]),col,1)
    if x%(step*2)==0: cv2.putText(f,str(x),(X+2,12),0,0.4,(0,255,0),1)
for y in range((y0//step+1)*step,y1,step):
    Y=int((y-y0)*z); col=(0,0,255) if y%100==0 else (0,180,255)
    cv2.line(f,(0,Y),(f.shape[1],Y),col,1)
    if y%(step*2)==0: cv2.putText(f,str(y),(2,Y-2),0,0.4,(0,255,0),1)
cv2.imwrite(out,f,[cv2.IMWRITE_JPEG_QUALITY,90])
