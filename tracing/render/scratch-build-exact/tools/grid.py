#!/usr/bin/env python3
# Save a SOURCE frame with a labelled 100 px coordinate grid (labels are true frame pixels), for measuring layouts.
# Usage: tools/grid.py T out.jpg [x0 y0 x1 y1]  (optional crop; the grid labels stay in frame pixels)
import cv2, sys, os
V=os.environ.get('REF','/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4')
t=float(sys.argv[1]); out=sys.argv[2]
c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*c.get(5)))); ok,f=c.read()
H,W=f.shape[:2]
step=100 if len(sys.argv)<7 else 50
for x in range(0,W,step):
    cv2.line(f,(x,0),(x,H),(0,200,255) if x%500 else (0,0,255),1); cv2.putText(f,str(x),(x+2,14),0,0.45,(0,255,255),1)
for y in range(0,H,step):
    cv2.line(f,(0,y),(W,y),(0,200,255) if y%500 else (0,0,255),1); cv2.putText(f,str(y),(2,y-3),0,0.45,(0,255,255),1)
if len(sys.argv)>=7:
    x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; f=cv2.resize(f[y0:y1,x0:x1],None,fx=2,fy=2,interpolation=cv2.INTER_CUBIC)
cv2.imwrite(out,f,[cv2.IMWRITE_JPEG_QUALITY,90])
