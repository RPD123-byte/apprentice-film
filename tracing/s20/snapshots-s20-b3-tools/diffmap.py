#!/usr/bin/env python3
# diffmap.py render.png source.png out.jpg [sigma] : blurred difference, red = render brighter, blue = darker; grid 100 px
import cv2, numpy as np, sys
sg=float(sys.argv[4]) if len(sys.argv)>4 else 10
r=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(sys.argv[1]),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),sg)
s=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(sys.argv[2]),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),sg)
d=r-s; a=np.clip(np.abs(d)*2.5,0,255).astype(np.uint8)
o=np.zeros(d.shape+(3,),np.uint8); o[...,2]=np.where(d>0,a,0); o[...,0]=np.where(d<0,a,0); o[...,1]=(s*0.25).astype(np.uint8)
for x in range(0,o.shape[1],100): cv2.line(o,(x,0),(x,o.shape[0]),(80,80,80),1); cv2.putText(o,str(x),(x+2,12),0,0.4,(0,255,255),1)
for y in range(0,o.shape[0],100): cv2.line(o,(0,y),(o.shape[1],y),(80,80,80),1); cv2.putText(o,str(y),(2,y-2),0,0.4,(0,255,255),1)
o=cv2.resize(o,None,fx=0.6,fy=0.6,interpolation=cv2.INTER_AREA)
cv2.imwrite(sys.argv[3],o,[cv2.IMWRITE_JPEG_QUALITY,85]); print('mean abs',np.abs(d).mean(),'bias',d.mean())
