#!/usr/bin/env python3
# crop.py FRAME|path x0 y0 x1 y1 scale out.jpg [step]  -- crop a source frame (index) with a labelled grid (frame px)
import cv2, sys
a=sys.argv
src=a[1]
p=src if not src.isdigit() else f'/Users/computer/rootline/apprentice-film/snapshots/s25-src/f{int(src):05d}.png'
f=cv2.imread(p)
x0,y0,x1,y1=[int(v) for v in a[2:6]]; sc=float(a[6]); out=a[7]; step=int(a[8]) if len(a)>8 else 50
c=cv2.resize(f[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
for x in range((x0//step+1)*step,x1,step):
    X=int((x-x0)*sc); cv2.line(c,(X,0),(X,c.shape[0]),(0,200,255) if x%100 else (0,0,255),1); cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//step+1)*step,y1,step):
    Y=int((y-y0)*sc); cv2.line(c,(0,Y),(c.shape[1],Y),(0,200,255) if y%100 else (0,0,255),1); cv2.putText(c,str(y),(2,Y-3),0,0.4,(0,255,255),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,90])
