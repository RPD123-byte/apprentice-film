#!/usr/bin/env python3
# grid over an image file: gridimg.py in.png out.jpg x0 y0 x1 y1 [zoom] [step]
import cv2, sys
f=cv2.imread(sys.argv[1]); out=sys.argv[2]
x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; z=float(sys.argv[7]) if len(sys.argv)>7 else 2; st=int(sys.argv[8]) if len(sys.argv)>8 else 50
c=f[y0:y1,x0:x1].copy(); c=cv2.resize(c,None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
for x in range((x0//st)*st,x1+1,st):
    if x<x0: continue
    X=int((x-x0)*z); cv2.line(c,(X,0),(X,c.shape[0]),(0,200,255) if x%100 else (0,0,255),1); cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//st)*st,y1+1,st):
    if y<y0: continue
    Y=int((y-y0)*z); cv2.line(c,(0,Y),(c.shape[1],Y),(0,200,255) if y%100 else (0,0,255),1); cv2.putText(c,str(y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,90])
