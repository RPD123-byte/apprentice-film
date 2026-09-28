# gridded, labelled, zoomed crop of a source frame (or any image): gridc.py T|img.png out.jpg x0 y0 x1 y1 [step] [zoom]
import cv2, sys, numpy as np
from src import frame
a=sys.argv
im=cv2.imread(a[1]) if a[1].endswith(('.png','.jpg')) else frame(float(a[1]))
out=a[2]; x0,y0,x1,y1=[int(v) for v in a[3:7]]; step=int(a[7]) if len(a)>7 else 25; z=float(a[8]) if len(a)>8 else 3
c=cv2.resize(im[y0:y1,x0:x1],None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
for x in range((x0//step+1)*step,x1,step):
    X=int((x-x0)*z); col=(0,0,255) if x%100==0 else (0,200,255)
    cv2.line(c,(X,0),(X,c.shape[0]),col,1)
    if x%(step*2)==0 or step>=50: cv2.putText(c,str(x),(X+2,12),0,0.4,(255,255,0),1)
for y in range((y0//step+1)*step,y1,step):
    Y=int((y-y0)*z); col=(0,0,255) if y%100==0 else (0,200,255)
    cv2.line(c,(0,Y),(c.shape[1],Y),col,1)
    if y%(step*2)==0 or step>=50: cv2.putText(c,str(y),(2,Y-2),0,0.4,(255,255,0),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,90])
