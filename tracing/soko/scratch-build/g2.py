#!/usr/bin/env python3
# g2.py img out x0 y0 x1 y1 [scale] [gamma] : crop, lift shadows (gamma), upscale, 10px grid, labels every 50
import cv2, sys, numpy as np
im=cv2.imread(sys.argv[1]); out=sys.argv[2]
x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]
sc=float(sys.argv[7]) if len(sys.argv)>7 else 3
gm=float(sys.argv[8]) if len(sys.argv)>8 else 0.6
f=im[y0:y1,x0:x1].astype(np.float32)/255
f=(np.power(f,gm)*255).astype(np.uint8)
f=cv2.resize(f,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
ov=f.copy()
for x in range((x0//10+1)*10,x1,10):
    X=int((x-x0)*sc); c=(0,0,255) if x%50==0 else (0,140,200)
    cv2.line(ov,(X,0),(X,f.shape[0]),c,1)
for y in range((y0//10+1)*10,y1,10):
    Y=int((y-y0)*sc); c=(0,0,255) if y%50==0 else (0,140,200)
    cv2.line(ov,(0,Y),(f.shape[1],Y),c,1)
f=cv2.addWeighted(ov,0.55,f,0.45,0)
for x in range((x0//50+1)*50,x1,50):
    X=int((x-x0)*sc); cv2.putText(f,str(x),(X+2,12),0,0.42,(0,255,255),1)
for y in range((y0//50+1)*50,y1,50):
    Y=int((y-y0)*sc); cv2.putText(f,str(y),(2,Y-3),0,0.42,(0,255,255),1)
cv2.imwrite(out,f,[cv2.IMWRITE_JPEG_QUALITY,90])
