#!/usr/bin/env python3
# gridc.py img out x0 y0 x1 y1 [scale] : plain crop with a light 10px grid and labels every 50 (page coords)
import cv2, sys
im=cv2.imread(sys.argv[1]); out=sys.argv[2]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; sc=float(sys.argv[7]) if len(sys.argv)>7 else 3
c=cv2.resize(im[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC); g=c.copy()
for x in range((x0//10+1)*10,x1,10): cv2.line(g,(int((x-x0)*sc),0),(int((x-x0)*sc),c.shape[0]),(0,0,255) if x%50==0 else (0,120,180),1)
for y in range((y0//10+1)*10,y1,10): cv2.line(g,(0,int((y-y0)*sc)),(c.shape[1],int((y-y0)*sc)),(0,0,255) if y%50==0 else (0,120,180),1)
c=cv2.addWeighted(g,0.3,c,0.7,0)
for x in range((x0//50+1)*50,x1,50): cv2.putText(c,str(x),(int((x-x0)*sc)+2,14),0,0.45,(0,255,255),1)
for y in range((y0//50+1)*50,y1,50): cv2.putText(c,str(y),(2,int((y-y0)*sc)-3),0,0.45,(0,255,255),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,90])
