#!/usr/bin/env python3
# sbs.py render.png t x0 y0 x1 y1 out.jpg [zoom] : render crop | source crop side by side
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
r=cv2.imread(sys.argv[1]); t=float(sys.argv[2]); x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; out=sys.argv[7]; z=float(sys.argv[8]) if len(sys.argv)>8 else 1
c=cv2.VideoCapture(V); c.set(1,int(round(t*25))); ok,s=c.read()
a=r[y0:y1,x0:x1].copy(); b=s[y0:y1,x0:x1].copy()
st=25 if (x1-x0)<700 else 50
for im_ in (a,b):
    for x in range((x0//st+1)*st,x1,st): cv2.line(im_,(x-x0,0),(x-x0,y1-y0),(0,120,200) if x%100 else (0,0,200),1)
    for y in range((y0//st+1)*st,y1,st): cv2.line(im_,(0,y-y0),(x1-x0,y-y0),(0,120,200) if y%100 else (0,0,200),1)
    for x in range((x0//100+1)*100,x1,100): cv2.putText(im_,str(x),(x-x0+2,12),0,0.4,(0,255,255),1)
    for y in range((y0//100+1)*100,y1,100): cv2.putText(im_,str(y),(2,y-y0-2),0,0.4,(0,255,255),1)
im=np.hstack([a,np.zeros((a.shape[0],6,3),np.uint8)+80,b]); im=cv2.resize(im,None,fx=z,fy=z,interpolation=cv2.INTER_AREA if z<1 else cv2.INTER_CUBIC)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90])
