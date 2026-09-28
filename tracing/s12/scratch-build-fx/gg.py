import cv2, sys
# g.py frame out.jpg [x0 y0 x1 y1] [scale]  grid every 50 (labels every 100)
f=int(sys.argv[1]); out=sys.argv[2]
im=cv2.imread(f'../src/f{f}.png')
import numpy as np
im=(255*np.power(im/255.0,0.6)).astype(np.uint8)
x0,y0,x1,y1=(0,0,2206,946) if len(sys.argv)<7 else [int(v) for v in sys.argv[3:7]]
sc=float(sys.argv[7]) if len(sys.argv)>7 else (1.0 if len(sys.argv)>=7 else 0.9)
for x in range(0,2206,50):
    cv2.line(im,(x,0),(x,946),(0,0,255) if x%500==0 else ((0,170,255) if x%100==0 else (0,110,160)),1)
for y in range(0,946,50):
    cv2.line(im,(0,y),(2206,y),(0,0,255) if y%500==0 else ((0,170,255) if y%100==0 else (0,110,160)),1)
c=im[y0:y1,x0:x1].copy()
c=cv2.resize(c,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
for x in range((x0//100)*100,x1,100):
    if x>=x0: cv2.putText(c,str(x),(int((x-x0)*sc)+2,14),0,0.45,(0,255,255),1)
for y in range((y0//100)*100,y1,100):
    if y>=y0: cv2.putText(c,str(y),(2,int((y-y0)*sc)-3),0,0.45,(0,255,255),1)
cv2.putText(c,f'{f}',(c.shape[1]-70,20),0,0.6,(0,255,0),2)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,88])
