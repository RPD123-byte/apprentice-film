#!/usr/bin/env python3
# g.py img out x0 y0 x1 y1 [scale] [step]  -- crop an image, upscale, overlay grid labelled in image px
import cv2, sys
im=cv2.imread(sys.argv[1]); out=sys.argv[2]
x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]
sc=float(sys.argv[7]) if len(sys.argv)>7 else 2
st=int(sys.argv[8]) if len(sys.argv)>8 else 20
f=cv2.resize(im[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
for x in range((x0//st+1)*st,x1,st):
    X=int((x-x0)*sc); major=x%(st*5)==0
    cv2.line(f,(X,0),(X,f.shape[0]),(0,0,255) if major else (0,160,220),1)
    if major: cv2.putText(f,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//st+1)*st,y1,st):
    Y=int((y-y0)*sc); major=y%(st*5)==0
    cv2.line(f,(0,Y),(f.shape[1],Y),(0,0,255) if major else (0,160,220),1)
    if major: cv2.putText(f,str(y),(2,Y-3),0,0.4,(0,255,255),1)
cv2.imwrite(out,f,[cv2.IMWRITE_JPEG_QUALITY,90])
