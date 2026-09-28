#!/usr/bin/env python3
# overlay.py render.png source.png out.jpg [x0 y0 x1 y1 zoom] : R,B = render, G = source (magenta = only mine, green = only source)
import cv2, numpy as np, sys
r=cv2.cvtColor(cv2.imread(sys.argv[1]),cv2.COLOR_BGR2GRAY); s=cv2.cvtColor(cv2.imread(sys.argv[2]),cv2.COLOR_BGR2GRAY)
o=np.dstack([r,s,r])
if len(sys.argv)>4:
    x0,y0,x1,y1=[int(v) for v in sys.argv[4:8]]; z=float(sys.argv[8]) if len(sys.argv)>8 else 1
    o=o[y0:y1,x0:x1]; o=cv2.resize(o,None,fx=z,fy=z,interpolation=cv2.INTER_AREA if z<1 else cv2.INTER_CUBIC)
    st=50
    for x in range((x0//st+1)*st,x1,st):
        X=int((x-x0)*z); cv2.line(o,(X,0),(X,8),(0,255,255),1); cv2.putText(o,str(x),(X+2,10),0,0.35,(0,255,255),1)
    for y in range((y0//st+1)*st,y1,st):
        Y=int((y-y0)*z); cv2.line(o,(0,Y),(8,Y),(0,255,255),1); cv2.putText(o,str(y),(2,Y-2),0,0.35,(0,255,255),1)
cv2.imwrite(sys.argv[3],o,[cv2.IMWRITE_JPEG_QUALITY,88])
